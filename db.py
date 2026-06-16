import os
from contextlib import contextmanager
from typing import Iterator, Optional

import psycopg2
from dotenv import load_dotenv

load_dotenv()


def _get_db_config() -> dict:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return {"dsn": database_url}

    required_keys = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]
    missing = [key for key in required_keys if not os.getenv(key)]
    if missing:
        missing_str = ", ".join(missing)
        raise RuntimeError(f"Missing required database environment variables: {missing_str}")

    return {
        "host": os.getenv("DB_HOST"),
        "port": os.getenv("DB_PORT"),
        "dbname": os.getenv("DB_NAME"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
    }


@contextmanager
def _get_connection() -> Iterator[psycopg2.extensions.connection]:
    config = _get_db_config()
    conn = psycopg2.connect(**config)
    try:
        yield conn
    finally:
        conn.close()


def get_watched_sections() -> list[str]:
    query = """
        SELECT DISTINCT section_id
        FROM watchlist
        ORDER BY section_id;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()
    return [row[0] for row in rows]


def get_cached_open_seats(section_id: str) -> Optional[int]:
    query = """
        SELECT open_seats
        FROM section_cache
        WHERE section_id = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (section_id,))
            row = cur.fetchone()
    return row[0] if row else None


def update_section_cache(section_id: str, open_seats: int, total_seats: int) -> None:
    query = """
        INSERT INTO section_cache (section_id, open_seats, total_seats, last_checked)
        VALUES (%s, %s, %s, NOW())
        ON CONFLICT (section_id)
        DO UPDATE SET
            open_seats = EXCLUDED.open_seats,
            total_seats = EXCLUDED.total_seats,
            last_checked = NOW();
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (section_id, open_seats, total_seats))
        conn.commit()


def get_users_watching(section_id: str) -> list[str]:
    query = """
        SELECT DISTINCT u.email
        FROM users u
        JOIN watchlist w ON w.user_id = u.id
        WHERE w.section_id = %s
        ORDER BY u.email;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (section_id,))
            rows = cur.fetchall()
    return [row[0] for row in rows]


def create_user(email: str, name: str | None) -> dict:
    query = """
        INSERT INTO users (email, name)
        VALUES (%s, %s)
        RETURNING id, email, name;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (email, name))
            row = cur.fetchone()
        conn.commit()

    return {"id": row[0], "email": row[1], "name": row[2]}


def get_user_by_email(email: str) -> Optional[dict]:
    query = """
        SELECT id, email, name
        FROM users
        WHERE email = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (email,))
            row = cur.fetchone()

    if not row:
        return None
    return {"id": row[0], "email": row[1], "name": row[2]}


def add_watchlist_entry(user_id: int, section_id: str, course_id: str) -> None:
    query = """
        INSERT INTO watchlist (user_id, section_id, course_id)
        VALUES (%s, %s, %s);
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (user_id, section_id, course_id))
        conn.commit()


def remove_watchlist_entry(user_id: int, section_id: str) -> int:
    query = """
        DELETE FROM watchlist
        WHERE user_id = %s AND section_id = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (user_id, section_id))
            deleted = cur.rowcount
        conn.commit()

    return deleted


def get_watchlist_for_user(user_id: int) -> list[dict]:
    query = """
        SELECT section_id, course_id, added_at
        FROM watchlist
        WHERE user_id = %s
        ORDER BY added_at DESC;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (user_id,))
            rows = cur.fetchall()

    return [
        {"section_id": row[0], "course_id": row[1], "added_at": row[2].isoformat() if row[2] else None}
        for row in rows
    ]
