from typing import Optional
import re
import hashlib
import os
import secrets
import time

import bcrypt
import psycopg2
import requests
import resend
import sqlite3
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from db import (
    add_watchlist_entry,
    consume_password_reset_code,
    create_user,
    create_user_with_password,
    get_password_reset_code,
    get_user_by_email,
    get_user_auth_by_email,
    get_watchlist_for_user,
    increment_password_reset_attempts,
    remove_watchlist_entry,
    is_watching_section,
    get_users_watching,
    update_user_password_hash,
    upsert_password_reset_code,
    upsert_register_verification_code,
    get_register_verification_code,
    increment_register_verification_attempts,
    delete_register_verification_code,
)
import scraper

SECTIONS_API_BASE = "https://api.umd.io/v1/courses/sections"


limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down and try again later."}
    )

frontend_url = os.getenv("FRONTEND_URL")
origins = ["http://localhost:5173"]
if frontend_url:
    # Handle multiple comma-separated origins if provided, or just append the single one
    if "," in frontend_url:
        origins.extend([o.strip() for o in frontend_url.split(",") if o.strip()])
    else:
        origins.append(frontend_url.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateUserRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class WatchlistRequest(BaseModel):
    section_id: str


class RegisterRequest(BaseModel):
    name: Optional[str] = None
    email: EmailStr
    password: str
    otp: str


class RegisterOtpRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


ALLOWED_EMAIL_SUFFIX = "@gmail.com"
PASSWORD_RESET_TTL_MINUTES = int(os.getenv("PASSWORD_RESET_TTL_MINUTES", "15"))
PASSWORD_RESET_OTP_LENGTH = 6
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-default-key-for-development")
ALGORITHM = "HS256"
reusable_oauth2 = HTTPBearer()


def get_current_user(http_auth: HTTPAuthorizationCredentials = Depends(reusable_oauth2)) -> dict:
    token = http_auth.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        email = payload.get("email")
        user_id = payload.get("id")
        if email is None or user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token claims")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _is_umd_email(email: str) -> bool:
    normalized = email.lower()
    return normalized.endswith(ALLOWED_EMAIL_SUFFIX)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _send_email(to_email: str, subject: str, plain_text: str) -> None:
    api_key = os.getenv("RESEND_API_KEY")
    sender_email = os.getenv("RESEND_SENDER_EMAIL")

    if not api_key or not sender_email:
        print("\n=== EMAIL SENT (MOCKED) ===")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{plain_text}")
        print("===========================\n")
        return

    resend.api_key = api_key
    try:
        resend.Emails.send({
            "from": sender_email,
            "to": [to_email],
            "subject": subject,
            "text": plain_text,
        })
    except Exception as exc:
        print(f"\n[Warning] Resend email sending failed: {exc}")
        raise RuntimeError(f"Resend email send failed: {exc}") from exc


def _generate_reset_otp() -> str:
    return secrets.token_hex(16)


def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


def _password_reset_expiration_epoch() -> int:
    return int(time.time()) + PASSWORD_RESET_TTL_MINUTES * 60


def _send_password_reset_email(email: str, otp: str) -> None:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/forgot-password?email={email}&token={otp}"
    subject = "SeatStalker password reset link"
    body = (
        "Click the link below to reset your SeatStalker password:\n\n"
        f"{reset_link}\n\n"
        f"This link expires in {PASSWORD_RESET_TTL_MINUTES} minutes.\n\n"
        "Note: If you do not see the email, please check your spam folder.\n\n"
        "Your friendly neighborhood seat stalker\n"
        "PS: Better than the McKeldin one\n"
    )
    _send_email(email, subject, body)


def _extract_section_payload(payload: object) -> dict:
    if isinstance(payload, list) and payload:
        item = payload[0]
        return item if isinstance(item, dict) else {}

    if isinstance(payload, dict):
        sections = payload.get("sections")
        if isinstance(sections, list) and sections:
            item = sections[0]
            return item if isinstance(item, dict) else {}
        return payload

    return {}


def _get_course_id_for_section(section_id: str) -> str:
    section_id = section_id.strip().upper()
    url = f"{SECTIONS_API_BASE}/{section_id}"
    course_id = None
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        payload = response.json()
        section_payload = _extract_section_payload(payload)
        course_id = section_payload.get("course") or section_payload.get("course_id")
    except (requests.RequestException, ValueError):
        pass

    if not course_id and "-" in section_id:
        course_id = section_id.split("-", 1)[0]

    if not course_id or not re.match(r"^[A-Z]{4}\d{3}[A-Z]?-[\w]+$", section_id):
        raise HTTPException(
            status_code=404,
            detail=f"invalid section id or no course exists: {section_id}"
        )

    return str(course_id)



@app.post("/users")
def create_user_endpoint(body: CreateUserRequest) -> dict:
    email = _normalize_email(str(body.email))
    if not _is_umd_email(email):
        raise HTTPException(status_code=400, detail="only @gmail.com mails allowed gang")

    try:
        user = create_user(email, body.name)
        return user
    except (psycopg2.errors.UniqueViolation, sqlite3.IntegrityError) as exc:
        raise HTTPException(status_code=409, detail="already someone with this mail in our directory") from exc
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"Database error creating user: {exc}") from exc


@app.get("/courses/{course_id}/sections")
def search_course_sections_endpoint(course_id: str) -> list[dict]:
    clean_course_id = course_id.strip().upper()
    if not re.match(r"^[A-Z]{4}\d{3}[A-Z]?$", clean_course_id):
        raise HTTPException(
            status_code=400,
            detail=f"invalid course id format: {course_id}"
        )
    try:
        sections = scraper.get_sections_from_testudo(clean_course_id, scraper.DEFAULT_SEMESTER)
        return sections
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"cant scrape data for shit {clean_course_id}: {exc}"
        )



@app.post("/auth/register/send-otp")
@limiter.limit("3/10 minutes")
def send_register_otp_endpoint(request: Request, body: RegisterOtpRequest) -> dict:
    email = _normalize_email(str(body.email))
    if not _is_umd_email(email):
        raise HTTPException(
            status_code=400,
            detail="only @gmail.com mails allowed gang",
        )

    # Check if user already exists
    user = get_user_by_email(email)
    if user:
        raise HTTPException(status_code=409, detail="already someone with this mail in our directory")

    # Check cooldown limit (30 seconds)
    verification = get_register_verification_code(email)
    if verification:
        time_since_creation = int(time.time()) - int(verification["created_at"])
        if time_since_creation < 30:
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {30 - time_since_creation} seconds before requesting another verification code."
            )

    # Generate 6-digit OTP code
    otp = f"{secrets.randbelow(10 ** 6):06d}"
    otp_hash = _hash_otp(otp)

    # Expires in 15 minutes
    expires_at = int(time.time()) + 15 * 60

    upsert_register_verification_code(email, otp_hash, expires_at)

    subject = "SeatStalker registration verification code"
    body_text = (
        "Use this code to verify your email and complete registration:\n\n"
        f"{otp}\n\n"
        "This code expires in 15 minutes.\n\n"
        "Note: If you do not see the email, please check your spam folder.\n\n"
        "Your friendly neighborhood seat stalker\n"
        "PS: Better than the McKeldin one\n"
    )

    try:
        _send_email(email, subject, body_text)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"success": True, "message": "verification code sent to your umd mail"}


@app.post("/auth/register")
@limiter.limit("5/hour")
def register_endpoint(request: Request, body: RegisterRequest) -> dict:
    email = _normalize_email(str(body.email))
    if not _is_umd_email(email):
        raise HTTPException(
            status_code=400,
            detail="only @gmail.com mails allowed gang",
        )

    if not body.password:
        raise HTTPException(status_code=400, detail="Password is required")

    errors = []
    if len(body.password) < 8:
        errors.append("must be at least 8 characters long")
    if not any(c.isdigit() for c in body.password):
        errors.append("must contain at least one number")
    if not any(c.isalpha() for c in body.password):
        errors.append("must contain at least one letter")

    if errors:
        raise HTTPException(
            status_code=400,
            detail=f"Password validation failed: {', '.join(errors)}."
        )

    # Verify registration OTP
    verification = get_register_verification_code(email)
    if not verification:
        raise HTTPException(status_code=400, detail="bad code bro, try sending a new one")

    now_epoch = int(time.time())
    if int(verification["expires_at"]) < now_epoch:
        raise HTTPException(status_code=400, detail="bad code bro, try sending a new one")

    provided_otp_hash = _hash_otp(body.otp.strip())
    if provided_otp_hash != str(verification["otp_hash"]):
        increment_register_verification_attempts(email)
        raise HTTPException(status_code=400, detail="bad code bro, try sending a new one")

    # Check if user already exists
    user = get_user_by_email(email)
    if user:
        raise HTTPException(status_code=409, detail="already someone with this mail in our directory")

    password_hash = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        create_user_with_password(body.name, email, password_hash)
        delete_register_verification_code(email)
    except (psycopg2.errors.UniqueViolation, sqlite3.IntegrityError) as exc:
        raise HTTPException(status_code=409, detail="already someone with this mail in our directory") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"database error creating user: {exc}") from exc

    return {"success": True, "message": "registration successful, come on in"}


@app.post("/auth/login")
@limiter.limit("10/15 minutes")
def login_endpoint(request: Request, body: LoginRequest) -> dict:
    email = _normalize_email(str(body.email))
    try:
        user = get_user_auth_by_email(email)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"database error during login: {exc}") from exc

    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="bad email or password")

    password_hash = str(user["password_hash"])
    is_valid = bcrypt.checkpw(body.password.encode("utf-8"), password_hash.encode("utf-8"))
    if not is_valid:
        raise HTTPException(status_code=401, detail="bad email or password")

    expire = int(time.time()) + (7 * 24 * 3600)
    token_payload = {
        "id": user["id"],
        "email": user["email"],
        "exp": expire
    }
    token = jwt.encode(token_payload, JWT_SECRET, algorithm=ALGORITHM)

    return {
        "success": True,
        "access_token": token,
        "token_type": "bearer",
        "email": user["email"],
        "name": user["name"]
    }


@app.post("/auth/password-reset/request")
@limiter.limit("3/10 minutes")
def request_password_reset_endpoint(request: Request, body: PasswordResetRequest) -> dict:
    email = _normalize_email(str(body.email))
    if not _is_umd_email(email):
        raise HTTPException(status_code=400, detail="only @gmail.com mails allowed gang")

    # Check cooldown limit (30 seconds)
    reset_code = get_password_reset_code(email)
    if reset_code:
        time_since_creation = int(time.time()) - int(reset_code["created_at"])
        if time_since_creation < 30:
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {30 - time_since_creation} seconds before requesting another reset link."
            )

    user = get_user_by_email(email)
    if user:
        otp = _generate_reset_otp()
        otp_hash = _hash_otp(otp)
        expires_at = _password_reset_expiration_epoch()
        upsert_password_reset_code(email, otp_hash, expires_at)
        try:
            _send_password_reset_email(email, otp)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"success": True, "message": "an email sent to your mail if you exist in the directory"}


@app.post("/auth/password-reset/confirm")
def confirm_password_reset_endpoint(body: PasswordResetConfirmRequest) -> dict:
    email = _normalize_email(str(body.email))
    if not _is_umd_email(email):
        raise HTTPException(status_code=400, detail="only @gmail.com mails allowed gang")

    reset_code = get_password_reset_code(email)
    if not reset_code:
        raise HTTPException(status_code=400, detail="bad code, get a new one")

    now_epoch = int(time.time())
    if reset_code.get("consumed_at") is not None or int(reset_code["expires_at"]) < now_epoch:
        raise HTTPException(status_code=400, detail="bad code, get a new one")

    otp_hash = _hash_otp(body.otp.strip())
    if otp_hash != str(reset_code["otp_hash"]):
        increment_password_reset_attempts(email)
        raise HTTPException(status_code=400, detail="bad code, get a new one")

    if not body.new_password:
        raise HTTPException(status_code=400, detail="get a new password")

    password_hash = bcrypt.hashpw(body.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    updated = update_user_password_hash(email, password_hash)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    consume_password_reset_code(email)
    return {"success": True, "message": "password reset successful"}


@app.post("/watchlist")
def add_watchlist_endpoint(body: WatchlistRequest, user: dict = Depends(get_current_user)) -> dict:
    course_id = _get_course_id_for_section(body.section_id)

    if is_watching_section(user["id"], body.section_id):
        raise HTTPException(status_code=409, detail="you already got the section in your list")

    try:
        watchlist = get_watchlist_for_user(user["id"])
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"database error fetching watchlist: {exc}") from exc

    if len(watchlist) >= 5:
        raise HTTPException(
            status_code=400,
            detail="can't do more than 5 courses, gotta give others a chance"
        )

    try:
        add_watchlist_entry(user["id"], body.section_id, course_id)
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"database error adding watchlist entry: {exc}") from exc

    return {
        "message": "watchlist entry added",
        "email": user["email"],
        "section_id": body.section_id,
        "course_id": course_id,
    }


@app.delete("/watchlist")
def delete_watchlist_endpoint(body: WatchlistRequest, user: dict = Depends(get_current_user)) -> dict:
    try:
        emails_watching = get_users_watching(body.section_id)
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"database error checking watchlist ownership: {exc}") from exc

    if not emails_watching:
        raise HTTPException(status_code=404, detail="entry not found")

    if user["email"] not in emails_watching:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this watchlist entry")

    try:
        deleted = remove_watchlist_entry(user["id"], body.section_id)
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"database error removing watchlist entry: {exc}") from exc

    if deleted == 0:
        raise HTTPException(status_code=404, detail="entry not found")

    return {"message": "watchlist entry removed", "email": user["email"], "section_id": body.section_id}


@app.get("/watchlist")
def get_watchlist_endpoint(user: dict = Depends(get_current_user)) -> dict:
    try:
        watchlist = get_watchlist_for_user(user["id"])
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"database error fetching watchlist: {exc}") from exc

    return {"email": user["email"], "watchlist": watchlist}

