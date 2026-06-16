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
