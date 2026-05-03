CREATE TABLE IF NOT EXISTS sessions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time    INTEGER NOT NULL,
    end_time      INTEGER,
    end_reason    TEXT,
    state_summary TEXT    NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS behavioral_snapshots (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL REFERENCES sessions(id),
    timestamp       INTEGER NOT NULL,
    typing_speed    REAL    NOT NULL DEFAULT 0,
    error_rate      REAL    NOT NULL DEFAULT 0,
    pause_count     INTEGER NOT NULL DEFAULT 0,
    mouse_speed     REAL    NOT NULL DEFAULT 0,
    mouse_jitter    REAL    NOT NULL DEFAULT 0,
    click_count     INTEGER NOT NULL DEFAULT 0,
    scroll_count    INTEGER NOT NULL DEFAULT 0,
    cpu_percent     REAL    NOT NULL DEFAULT 0,
    ram_percent     REAL    NOT NULL DEFAULT 0,
    battery_percent INTEGER NOT NULL DEFAULT -1,
    on_battery      INTEGER NOT NULL DEFAULT 0,
    window_count           INTEGER NOT NULL DEFAULT 0,
    foreground_app         TEXT    NOT NULL DEFAULT '',
    app_switch_count       INTEGER NOT NULL DEFAULT 0,
    single_window_hold_ms  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_snapshots_session ON behavioral_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_ts      ON behavioral_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_start    ON sessions(start_time);
