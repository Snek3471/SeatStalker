CREATE TABLE IF NOT EXISTS poller_state (
    key TEXT PRIMARY KEY,
    cursor INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poller_lock (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
    locked_until TIMESTAMPTZ NOT NULL DEFAULT TO_TIMESTAMP(0)
);

INSERT INTO poller_lock (id, locked_until)
VALUES (TRUE, TO_TIMESTAMP(0))
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION try_acquire_poller_lock(lock_seconds INTEGER DEFAULT 90)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    acquired BOOLEAN;
BEGIN
    UPDATE poller_lock
    SET locked_until = NOW() + make_interval(secs => lock_seconds)
    WHERE id = TRUE AND locked_until < NOW()
    RETURNING TRUE INTO acquired;
    RETURN COALESCE(acquired, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION release_poller_lock()
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE poller_lock SET locked_until = TO_TIMESTAMP(0) WHERE id = TRUE;
$$;
