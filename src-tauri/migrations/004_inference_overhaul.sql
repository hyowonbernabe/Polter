-- ── session_summaries ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_summaries (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id            INTEGER NOT NULL,
    session_start_ms      INTEGER NOT NULL,
    session_end_ms        INTEGER NOT NULL,
    duration_mins         INTEGER NOT NULL DEFAULT 0,
    states_json           TEXT    NOT NULL DEFAULT '{}',
    longest_focus_mins    INTEGER NOT NULL DEFAULT 0,
    avg_typing_speed_z    REAL    NOT NULL DEFAULT 0,
    avg_error_rate_z      REAL    NOT NULL DEFAULT 0,
    avg_mouse_speed_z     REAL    NOT NULL DEFAULT 0,
    avg_mouse_jitter_z    REAL    NOT NULL DEFAULT 0,
    avg_pause_frequency_z REAL    NOT NULL DEFAULT 0,
    avg_app_switch_rate_z REAL    NOT NULL DEFAULT 0,
    insight_count         INTEGER NOT NULL DEFAULT 0,
    burn_episodes         INTEGER NOT NULL DEFAULT 0,
    created_at            INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_session_summaries_start
    ON session_summaries(session_start_ms);

-- ── wisp_memories ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wisp_memories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp_ms  INTEGER NOT NULL,
    state         TEXT    NOT NULL DEFAULT '',
    insight_type  TEXT    NOT NULL DEFAULT '',
    memory_note   TEXT    NOT NULL,
    insight_id    INTEGER,
    consolidated  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_wisp_memories_ts
    ON wisp_memories(timestamp_ms);

-- ── weekly_summaries ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_summaries (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start_date     TEXT    NOT NULL,
    week_end_date       TEXT    NOT NULL,
    total_active_mins   INTEGER NOT NULL DEFAULT 0,
    session_count       INTEGER NOT NULL DEFAULT 0,
    states_json         TEXT    NOT NULL DEFAULT '{}',
    longest_focus_mins  INTEGER NOT NULL DEFAULT 0,
    insight_count       INTEGER NOT NULL DEFAULT 0,
    burn_episodes       INTEGER NOT NULL DEFAULT 0,
    memory_digest       TEXT,
    notable_events      TEXT,
    created_at          INTEGER NOT NULL DEFAULT 0,
    UNIQUE(week_start_date)
);
