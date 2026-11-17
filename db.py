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
def _get_connection() -> Iterator:
    config = _get_db_config()
    conn = psycopg2.connect(**config)
    try:
        yield conn
    finally:
        conn.close()


def _ensure_password_hash_column() -> None:
    query = """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password_hash TEXT;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
        conn.commit()


def _ensure_password_reset_codes_table() -> None:
    query = """
        CREATE TABLE IF NOT EXISTS password_reset_codes (
            email TEXT PRIMARY KEY,
            otp_hash TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            consumed_at INTEGER,
            created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
        );
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
        conn.commit()


def _ensure_register_verification_codes_table() -> None:
    query = """
        CREATE TABLE IF NOT EXISTS register_verification_codes (
            email TEXT PRIMARY KEY,
            otp_hash TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
        );
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
        conn.commit()


def _ensure_notified_at_column() -> None:
    query = """
        ALTER TABLE watchlist
        ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
        conn.commit()


def _ensure_section_cache_columns() -> None:
    statements = [
        "ALTER TABLE section_cache ADD COLUMN IF NOT EXISTS waitlist INTEGER;",
        "ALTER TABLE section_cache ADD COLUMN IF NOT EXISTS is_available INTEGER NOT NULL DEFAULT 0;",
    ]
    with _get_connection() as conn:
        with conn.cursor() as cur:
            for statement in statements:
                cur.execute(statement)
        conn.commit()


def _initialize_database() -> None:
    try:
        _ensure_password_hash_column()
    except (RuntimeError, psycopg2.Error):
        pass

    try:
        _ensure_password_reset_codes_table()
    except (RuntimeError, psycopg2.Error):
        pass

    try:
        _ensure_register_verification_codes_table()
    except (RuntimeError, psycopg2.Error):
        pass

    try:
        _ensure_notified_at_column()
    except (RuntimeError, psycopg2.Error):
        pass

    try:
        _ensure_section_cache_columns()
    except (RuntimeError, psycopg2.Error):
        pass








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


def is_watching_section(user_id: int, section_id: str) -> bool:
    query = """
        SELECT 1 FROM watchlist
        WHERE user_id = %s AND section_id = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (user_id, section_id))
            row = cur.fetchone()
    return row is not None


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

    watchlist = []
    for row in rows:
        added_at = row[2]
        if added_at is not None and hasattr(added_at, "isoformat"):
            added_at = added_at.isoformat()
        watchlist.append({"section_id": row[0], "course_id": row[1], "added_at": added_at})

    return watchlist


def create_user_with_password(name: str | None, email: str, password_hash: str) -> dict:
    query = """
        INSERT INTO users (name, email, password_hash)
        VALUES (%s, %s, %s)
        RETURNING id, email, name;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (name, email, password_hash))
            row = cur.fetchone()
        conn.commit()

    return {"id": row[0], "email": row[1], "name": row[2]}


def upsert_password_reset_code(email: str, otp_hash: str, expires_at: int) -> None:
    query = """
        INSERT INTO password_reset_codes (email, otp_hash, expires_at, attempts, consumed_at, created_at)
        VALUES (%s, %s, %s, 0, NULL, %s)
        ON CONFLICT(email) DO UPDATE SET
            otp_hash = excluded.otp_hash,
            expires_at = excluded.expires_at,
            attempts = 0,
            consumed_at = NULL,
            created_at = excluded.created_at;
    """
    created_at = int(__import__("time").time())
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (email, otp_hash, expires_at, created_at))
        conn.commit()


def get_password_reset_code(email: str) -> Optional[dict]:
    query = """
        SELECT email, otp_hash, expires_at, attempts, consumed_at, created_at
        FROM password_reset_codes
        WHERE email = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (email,))
            row = cur.fetchone()

    if not row:
        return None

    return {
        "email": row[0],
        "otp_hash": row[1],
        "expires_at": row[2],
        "attempts": row[3],
        "consumed_at": row[4],
        "created_at": row[5],
    }


def increment_password_reset_attempts(email: str) -> None:
    query = """
        UPDATE password_reset_codes
        SET attempts = attempts + 1
        WHERE email = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (email,))
        conn.commit()


def consume_password_reset_code(email: str) -> None:
    query = """
        UPDATE password_reset_codes
        SET consumed_at = %s
        WHERE email = %s;
    """
    consumed_at = int(__import__("time").time())
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (consumed_at, email))
        conn.commit()


def update_user_password_hash(email: str, password_hash: str) -> bool:
    query = """
        UPDATE users
        SET password_hash = %s
        WHERE email = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (password_hash, email))
            updated = cur.rowcount
        conn.commit()

    return updated > 0


def upsert_register_verification_code(email: str, otp_hash: str, expires_at: int) -> None:
    query = """
        INSERT INTO register_verification_codes (email, otp_hash, expires_at, attempts, created_at)
        VALUES (%s, %s, %s, 0, %s)
        ON CONFLICT(email) DO UPDATE SET
            otp_hash = excluded.otp_hash,
            expires_at = excluded.expires_at,
            attempts = 0,
            created_at = excluded.created_at;
    """
    created_at = int(__import__("time").time())
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (email, otp_hash, expires_at, created_at))
        conn.commit()


def get_register_verification_code(email: str) -> Optional[dict]:
    query = """
        SELECT email, otp_hash, expires_at, attempts, created_at
        FROM register_verification_codes
        WHERE email = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (email,))
            row = cur.fetchone()

    if not row:
        return None

    return {
        "email": row[0],
        "otp_hash": row[1],
        "expires_at": row[2],
        "attempts": row[3],
        "created_at": row[4],
    }


def increment_register_verification_attempts(email: str) -> None:
    query = """
        UPDATE register_verification_codes
        SET attempts = attempts + 1
        WHERE email = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (email,))
        conn.commit()


def delete_register_verification_code(email: str) -> None:
    query = """
        DELETE FROM register_verification_codes
        WHERE email = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (email,))
        conn.commit()








def get_user_auth_by_email(email: str) -> Optional[dict]:
    query = """
        SELECT id, email, name, password_hash
        FROM users
        WHERE email = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (email,))
            row = cur.fetchone()

    if not row:
        return None

    return {"id": row[0], "email": row[1], "name": row[2], "password_hash": row[3]}


_initialize_database()
