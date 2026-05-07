pub mod queries;

use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use sqlx::{Pool, Sqlite};
use std::str::FromStr;
use std::sync::Arc;

pub type DbWritePool = Pool<Sqlite>;
pub type DbReadPool = Pool<Sqlite>;

#[derive(Clone)]
pub struct DbPools {
    pub write: Arc<DbWritePool>,
    pub read: Arc<DbReadPool>,
}

pub async fn init(db_path: &str) -> Result<DbPools, sqlx::Error> {
    let opts = SqliteConnectOptions::from_str(&format!("sqlite:{}", db_path))?
        .journal_mode(SqliteJournalMode::Wal)
        .pragma("synchronous", "NORMAL")
        .pragma("busy_timeout", "5000")
        .create_if_missing(true);

    let write = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(opts.clone())
        .await?;

    let read = SqlitePoolOptions::new()
        .max_connections(4)
        .connect_with(opts)
        .await?;

    sqlx::raw_sql(include_str!("../../migrations/001_initial.sql"))
        .execute(&write)
        .await?;

    sqlx::raw_sql(include_str!("../../migrations/002_group3.sql"))
        .execute(&write)
        .await?;

    sqlx::raw_sql(include_str!("../../migrations/003_group6.sql"))
        .execute(&write)
        .await?;

    sqlx::raw_sql(include_str!("../../migrations/004_inference_overhaul.sql"))
        .execute(&write)
        .await?;

    // Phase A + B signals — individual ALTER TABLEs to handle re-runs gracefully.
    let new_snapshot_columns = [
        // Phase A
        "ALTER TABLE behavioral_snapshots ADD COLUMN undo_count          INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE behavioral_snapshots ADD COLUMN redo_count          INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE behavioral_snapshots ADD COLUMN save_count          INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE behavioral_snapshots ADD COLUMN avg_key_hold_ms     INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE behavioral_snapshots ADD COLUMN right_click_count   INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE behavioral_snapshots ADD COLUMN scroll_depth_y      INTEGER NOT NULL DEFAULT 0",
        // Phase B
        "ALTER TABLE behavioral_snapshots ADD COLUMN display_brightness  INTEGER NOT NULL DEFAULT -1",
        "ALTER TABLE behavioral_snapshots ADD COLUMN night_light_enabled INTEGER NOT NULL DEFAULT 0",
    ];
    for stmt in &new_snapshot_columns {
        let _ = sqlx::raw_sql(stmt).execute(&write).await;
    }

    // ALTER TABLE ADD COLUMN is not idempotent in SQLite, so we attempt each
    // column addition individually and ignore "duplicate column" errors.
    let daily_summary_columns = [
        "ALTER TABLE daily_summaries ADD COLUMN day_of_week        INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE daily_summaries ADD COLUMN avg_typing_speed_z REAL    NOT NULL DEFAULT 0",
        "ALTER TABLE daily_summaries ADD COLUMN avg_error_rate_z   REAL    NOT NULL DEFAULT 0",
        "ALTER TABLE daily_summaries ADD COLUMN avg_mouse_speed_z  REAL    NOT NULL DEFAULT 0",
        "ALTER TABLE daily_summaries ADD COLUMN avg_mouse_jitter_z REAL    NOT NULL DEFAULT 0",
        "ALTER TABLE daily_summaries ADD COLUMN avg_pause_frequency_z REAL NOT NULL DEFAULT 0",
        "ALTER TABLE daily_summaries ADD COLUMN avg_app_switch_rate_z REAL NOT NULL DEFAULT 0",
        "ALTER TABLE daily_summaries ADD COLUMN insight_count      INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE daily_summaries ADD COLUMN burn_episodes      INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE daily_summaries ADD COLUMN notable_events     TEXT",
        "ALTER TABLE daily_summaries ADD COLUMN memory_digest      TEXT",
        "ALTER TABLE daily_summaries ADD COLUMN consolidated       INTEGER NOT NULL DEFAULT 0",
    ];
    for stmt in &daily_summary_columns {
        let _ = sqlx::raw_sql(stmt).execute(&write).await;
        // Errors (e.g., "duplicate column name") are silently ignored —
        // this means the column already exists, which is the desired state.
    }

    Ok(DbPools {
        write: Arc::new(write),
        read: Arc::new(read),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    async fn temp_db() -> (DbPools, TempDir) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.db");
        let pools = init(path.to_str().unwrap()).await.unwrap();
        (pools, dir)
    }

    #[tokio::test]
    async fn db_initializes_and_schema_exists() {
        let (pools, _dir) = temp_db().await;
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM sessions")
            .fetch_one(pools.read.as_ref())
            .await
            .unwrap();
        assert_eq!(row.0, 0);
    }

    #[tokio::test]
    async fn behavioral_snapshots_table_exists() {
        let (pools, _dir) = temp_db().await;
        let row: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM behavioral_snapshots")
                .fetch_one(pools.read.as_ref())
                .await
                .unwrap();
        assert_eq!(row.0, 0);
    }

    #[tokio::test]
    async fn wal_mode_enabled() {
        let (pools, _dir) = temp_db().await;
        let row: (String,) = sqlx::query_as("PRAGMA journal_mode")
            .fetch_one(pools.read.as_ref())
            .await
            .unwrap();
        assert_eq!(row.0, "wal");
    }

    #[tokio::test]
    async fn baseline_table_exists() {
        let (pools, _dir) = temp_db().await;
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM baseline")
            .fetch_one(pools.read.as_ref())
            .await
            .unwrap();
        assert_eq!(row.0, 0);
    }

    #[tokio::test]
    async fn daily_summaries_table_exists() {
        let (pools, _dir) = temp_db().await;
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM daily_summaries")
            .fetch_one(pools.read.as_ref())
            .await
            .unwrap();
        assert_eq!(row.0, 0);
    }

    #[tokio::test]
    async fn insights_table_exists() {
        let (pools, _dir) = temp_db().await;
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM insights")
            .fetch_one(pools.read.as_ref())
            .await
            .unwrap();
        assert_eq!(row.0, 0);
    }

    #[tokio::test]
    async fn insight_dedup_log_table_exists() {
        let (pools, _dir) = temp_db().await;
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM insight_dedup_log")
            .fetch_one(pools.read.as_ref())
            .await
            .unwrap();
        assert_eq!(row.0, 0);
    }
}
