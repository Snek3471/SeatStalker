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
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        return

    try:
        _ensure_password_hash_column()
    except (RuntimeError, psycopg2.Error):
        pass



_initialize_database()
