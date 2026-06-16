from typing import Optional

import psycopg2
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from db import (
    add_watchlist_entry,
    create_user,
    get_user_by_email,
    get_watchlist_for_user,
    remove_watchlist_entry,
)

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
    url = f"{SECTIONS_API_BASE}/{section_id}"
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch section data: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Invalid JSON from section API: {exc}") from exc

    section_payload = _extract_section_payload(payload)
    course_id = section_payload.get("course") or section_payload.get("course_id")

    if not course_id and "-" in section_id:
        course_id = section_id.split("-", 1)[0]

    if not course_id:
        raise HTTPException(status_code=404, detail=f"Could not determine course_id for section {section_id}")

    return str(course_id)


@app.post("/users")
def create_user_endpoint(body: CreateUserRequest) -> dict:
    try:
        user = create_user(body.email, body.name)
        return user
    except psycopg2.errors.UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="User with this email already exists") from exc
    except psycopg2.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error creating user: {exc}") from exc


@app.post("/watchlist")
def add_watchlist_endpoint(body: WatchlistRequest) -> dict:
    user = get_user_by_email(body.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    course_id = _get_course_id_for_section(body.section_id)

    try:
        add_watchlist_entry(user["id"], body.section_id, course_id)
    except psycopg2.Error as exc:
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
    except psycopg2.Error as exc:
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
    except psycopg2.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error fetching watchlist: {exc}") from exc

    return {"email": str(email), "watchlist": watchlist}
