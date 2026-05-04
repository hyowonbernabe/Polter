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
}
