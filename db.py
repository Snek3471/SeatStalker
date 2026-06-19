import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional

import psycopg2
from dotenv import load_dotenv

load_dotenv()

SQLITE_DB_PATH = os.getenv(
    "SQLITE_DB_PATH",
    str(Path(__file__).resolve().parent / "seatstalker.db"),
)


def _is_sqlite_mode() -> bool:
    if os.getenv("DATABASE_URL"):
        return False

    required_keys = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]
    return all(not os.getenv(key) for key in required_keys)


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


def _init_sqlite_schema() -> None:
    statements = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            password_hash TEXT
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS watchlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            section_id TEXT NOT NULL,
            course_id TEXT NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            alert_sent INTEGER NOT NULL DEFAULT 0
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS section_cache (
            section_id TEXT PRIMARY KEY,
            open_seats INTEGER,
            total_seats INTEGER,
            last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS password_reset_codes (
            email TEXT PRIMARY KEY,
            otp_hash TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            consumed_at INTEGER,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS register_verification_codes (
            email TEXT PRIMARY KEY,
            otp_hash TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );
        """,
    ]
    with _get_connection() as conn:
        with conn.cursor() as cur:
            for statement in statements:
                cur.execute(statement)
        conn.commit()


def _ensure_password_hash_column() -> None:
    query = """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password_hash TEXT;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
        conn.commit()


def _ensure_password_hash_column_sqlite() -> None:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("PRAGMA table_info(users)")
            columns = [row[1] for row in cur.fetchall()]
            if "password_hash" not in columns:
                cur.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
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


def _ensure_alert_sent_column_sqlite() -> None:
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("PRAGMA table_info(watchlist)")
            columns = [row[1] for row in cur.fetchall()]
            if "alert_sent" not in columns:
                cur.execute("ALTER TABLE watchlist ADD COLUMN alert_sent INTEGER NOT NULL DEFAULT 0")
        conn.commit()


def _ensure_alert_sent_column_postgres() -> None:
    query = """
        ALTER TABLE watchlist
        ADD COLUMN IF NOT EXISTS alert_sent INTEGER NOT NULL DEFAULT 0;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
        conn.commit()



@contextmanager
def _get_connection() -> Iterator:
    if _is_sqlite_mode():
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield _SqliteConnection(conn)
        finally:
            conn.close()
        return

    config = _get_db_config()
    conn = psycopg2.connect(**config)
    try:
        yield conn
    finally:
        conn.close()


class _SqliteCursor:
    def __init__(self, cursor: sqlite3.Cursor) -> None:
        self._cursor = cursor

    def execute(self, query: str, params: tuple | None = None) -> None:
        self._cursor.execute(query.replace("%s", "?"), params or ())

    def fetchall(self) -> list:
        return self._cursor.fetchall()

    def fetchone(self):
        return self._cursor.fetchone()

    @property
    def rowcount(self) -> int:
        return self._cursor.rowcount

    def __enter__(self) -> "_SqliteCursor":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self._cursor.close()


class _SqliteConnection:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def cursor(self) -> _SqliteCursor:
        return _SqliteCursor(self._conn.cursor())

    def commit(self) -> None:
        self._conn.commit()


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
    if _is_sqlite_mode():
        query = """
            INSERT INTO section_cache (section_id, open_seats, total_seats, last_checked)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT(section_id) DO UPDATE SET
                open_seats = excluded.open_seats,
                total_seats = excluded.total_seats,
                last_checked = CURRENT_TIMESTAMP;
        """
    else:
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


def get_unnotified_users_for_section(section_id: str) -> list[dict]:
    query = """
        SELECT w.id, u.email
        FROM watchlist w
        JOIN users u ON w.user_id = u.id
        WHERE w.section_id = %s AND w.alert_sent = 0;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (section_id,))
            rows = cur.fetchall()
    return [{"watchlist_id": row[0], "email": row[1]} for row in rows]


def mark_watchlist_entry_notified(email: str, section_id: str) -> None:
    query = """
        UPDATE watchlist
        SET alert_sent = 1
        WHERE user_id = (SELECT id FROM users WHERE email = %s) AND section_id = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (email, section_id))
        conn.commit()


def reset_watchlist_alerts(section_id: str) -> None:
    query = """
        UPDATE watchlist
        SET alert_sent = 0
        WHERE section_id = %s;
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (section_id,))
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


def _initialize_database() -> None:
    if _is_sqlite_mode():
        _init_sqlite_schema()
        try:
            _ensure_password_hash_column_sqlite()
        except sqlite3.Error:
            pass
        try:
            _ensure_alert_sent_column_sqlite()
        except sqlite3.Error:
            pass
        return

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
        _ensure_alert_sent_column_postgres()
    except (RuntimeError, psycopg2.Error):
        pass



_initialize_database()
