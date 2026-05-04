CREATE TABLE IF NOT EXISTS insights (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp     INTEGER NOT NULL,
    session_id    INTEGER,
    state         TEXT    NOT NULL,
    insight_text  TEXT    NOT NULL,
    extended_text TEXT    NOT NULL,
    insight_type  TEXT    NOT NULL,
    shown         INTEGER NOT NULL DEFAULT 0,
    dismissed_at  INTEGER
);

CREATE TABLE IF NOT EXISTS insight_dedup_log (
    insight_type  TEXT    PRIMARY KEY,
    last_seen_ms  INTEGER NOT NULL,
    count_in_48h  INTEGER NOT NULL DEFAULT 1
);
