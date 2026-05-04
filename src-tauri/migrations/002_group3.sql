CREATE TABLE IF NOT EXISTS baseline (
    signal             TEXT    NOT NULL,
    time_of_day_bucket INTEGER NOT NULL,
    day_of_week        INTEGER NOT NULL,
    ema_mean           REAL    NOT NULL DEFAULT 0,
    ema_variance       REAL    NOT NULL DEFAULT 0,
    sample_count       INTEGER NOT NULL DEFAULT 0,
    last_updated_ms    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (signal, time_of_day_bucket, day_of_week)
);

CREATE TABLE IF NOT EXISTS daily_summaries (
    date                        TEXT    NOT NULL PRIMARY KEY,
    total_active_minutes        INTEGER NOT NULL DEFAULT 0,
    focus_minutes               INTEGER NOT NULL DEFAULT 0,
    calm_minutes                INTEGER NOT NULL DEFAULT 0,
    deep_minutes                INTEGER NOT NULL DEFAULT 0,
    spark_minutes               INTEGER NOT NULL DEFAULT 0,
    burn_minutes                INTEGER NOT NULL DEFAULT 0,
    fade_minutes                INTEGER NOT NULL DEFAULT 0,
    rest_minutes                INTEGER NOT NULL DEFAULT 0,
    longest_focus_block_minutes INTEGER NOT NULL DEFAULT 0,
    session_count               INTEGER NOT NULL DEFAULT 0
);
