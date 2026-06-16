CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT
);

CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    added_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS section_cache (
    section_id TEXT PRIMARY KEY,
    open_seats INTEGER,
    total_seats INTEGER,
    last_checked TIMESTAMP DEFAULT NOW()
);
