from typing import Optional
import re

import bcrypt
import psycopg2
import requests
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from db import (
    add_watchlist_entry,
    create_user,
    create_user_with_password,
    get_user_by_email,
    get_user_auth_by_email,
    get_watchlist_for_user,
    remove_watchlist_entry,
    is_watching_section,
)
import scraper

SECTIONS_API_BASE = "https://api.umd.io/v1/courses/sections"


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateUserRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class WatchlistRequest(BaseModel):
    email: EmailStr
    section_id: str


class RegisterRequest(BaseModel):
    name: Optional[str] = None
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


UMD_EMAIL_SUFFIXES = ("@umd.edu", "@terpmail.umd.edu")


def _is_umd_email(email: str) -> bool:
    normalized = email.lower()
    return any(normalized.endswith(suffix) for suffix in UMD_EMAIL_SUFFIXES)


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
            detail=f"Invalid section ID format or course could not be determined: {section_id}"
        )

    return str(course_id)



@app.post("/users")
def create_user_endpoint(body: CreateUserRequest) -> dict:
    try:
        user = create_user(body.email, body.name)
        return user
    except (psycopg2.errors.UniqueViolation, sqlite3.IntegrityError) as exc:
        raise HTTPException(status_code=409, detail="User with this email already exists") from exc
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"Database error creating user: {exc}") from exc


@app.get("/courses/{course_id}/sections")
def search_course_sections_endpoint(course_id: str) -> list[dict]:
    clean_course_id = course_id.strip().upper()
    if not re.match(r"^[A-Z]{4}\d{3}[A-Z]?$", clean_course_id):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid course ID format: {course_id}"
        )
    try:
        sections = scraper.get_sections_from_testudo(clean_course_id, scraper.DEFAULT_SEMESTER)
        return sections
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error scraping sections for course {clean_course_id}: {exc}"
        )



@app.post("/auth/register")
def register_endpoint(body: RegisterRequest) -> dict:
    email = str(body.email).strip().lower()
    if not _is_umd_email(email):
        raise HTTPException(
            status_code=400,
            detail="Only @umd.edu or @terpmail.umd.edu email addresses are allowed",
        )

    if not body.password:
        raise HTTPException(status_code=400, detail="Password is required")

    password_hash = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        create_user_with_password(body.name, email, password_hash)
    except (psycopg2.errors.UniqueViolation, sqlite3.IntegrityError) as exc:
        raise HTTPException(status_code=409, detail="User with this email already exists") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"Database error creating user: {exc}") from exc

    return {"success": True, "message": "User registered successfully"}


@app.post("/auth/login")
def login_endpoint(body: LoginRequest) -> dict:
    email = str(body.email).strip().lower()
    try:
        user = get_user_auth_by_email(email)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"Database error during login: {exc}") from exc

    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    password_hash = str(user["password_hash"])
    is_valid = bcrypt.checkpw(body.password.encode("utf-8"), password_hash.encode("utf-8"))
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"success": True, "email": user["email"], "name": user["name"]}


@app.post("/watchlist")
def add_watchlist_endpoint(body: WatchlistRequest) -> dict:
    user = get_user_by_email(body.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    course_id = _get_course_id_for_section(body.section_id)

    if is_watching_section(user["id"], body.section_id):
        raise HTTPException(status_code=409, detail="Section is already in your watchlist")

    try:
        add_watchlist_entry(user["id"], body.section_id, course_id)
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"Database error adding watchlist entry: {exc}") from exc

    return {
        "message": "Watchlist entry added",
        "email": body.email,
        "section_id": body.section_id,
        "course_id": course_id,
    }


@app.delete("/watchlist")
def delete_watchlist_endpoint(body: WatchlistRequest) -> dict:
    user = get_user_by_email(body.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        deleted = remove_watchlist_entry(user["id"], body.section_id)
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"Database error removing watchlist entry: {exc}") from exc

    if deleted == 0:
        raise HTTPException(status_code=404, detail="Watchlist entry not found")

    return {"message": "Watchlist entry removed", "email": body.email, "section_id": body.section_id}


@app.get("/watchlist/{email}")
def get_watchlist_endpoint(email: EmailStr) -> dict:
    user = get_user_by_email(str(email))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        watchlist = get_watchlist_for_user(user["id"])
    except (psycopg2.Error, sqlite3.Error) as exc:
        raise HTTPException(status_code=500, detail=f"Database error fetching watchlist: {exc}") from exc

    return {"email": str(email), "watchlist": watchlist}

