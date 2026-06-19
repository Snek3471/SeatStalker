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
    added_at TIMESTAMP DEFAULT NOW(),
    alert_sent INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS section_cache (
    section_id TEXT PRIMARY KEY,
    open_seats INTEGER,
    total_seats INTEGER,
    last_checked TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_codes (
    email TEXT PRIMARY KEY,
    otp_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    consumed_at INTEGER,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE TABLE IF NOT EXISTS register_verification_codes (
    email TEXT PRIMARY KEY,
    otp_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

