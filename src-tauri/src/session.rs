use crate::pipeline::ring_buffer::RingBuffer;
use crate::storage::{self, DbPools};
use crate::storage::queries;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::time::{interval, Duration};

pub type SessionId = Arc<Mutex<Option<i64>>>;

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

pub async fn start_new_session(
    pools: &DbPools,
    session_id: &SessionId,
) -> Result<i64, sqlx::Error> {
    let id = queries::start_session(pools.write.as_ref(), now_ms()).await?;
    *session_id.lock().unwrap() = Some(id);
    Ok(id)
}

pub async fn end_current_session(
    pools: &DbPools,
    session_id: &SessionId,
    reason: &str,
) -> Result<(), sqlx::Error> {
    let id = {
        let mut guard = session_id.lock().unwrap();
        guard.take()
    };
    if let Some(id) = id {
        queries::end_session(pools.write.as_ref(), id, now_ms(), reason).await?;
    }
    Ok(())
}

pub async fn handle_wake(pools: &DbPools, session_id: &SessionId) -> Result<i64, sqlx::Error> {
    end_current_session(pools, session_id, "wake").await?;
    start_new_session(pools, session_id).await
}

/// Polls every 60 seconds for inactivity. Ends the session if the ring buffer
/// has seen no events for 10 minutes (600,000 ms).
pub fn start_inactivity_watcher(
    ring: Arc<Mutex<RingBuffer>>,
    pools: DbPools,
    session_id: SessionId,
) {
    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(60));
        ticker.tick().await; // skip the immediate first tick
        loop {
            ticker.tick().await;
            let last_ts = {
                let guard = ring.lock().unwrap();
                guard.last_event_ts()
            };
            let now_u64 = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            let idle_ms = match last_ts {
                Some(ts) => now_u64.saturating_sub(ts),
                None => u64::MAX,
            };

            if idle_ms >= 600_000 {
                let _ = end_current_session(&pools, &session_id, "inactivity").await;
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    async fn temp_pools() -> (DbPools, TempDir) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.db");
        let pools = storage::init(path.to_str().unwrap()).await.unwrap();
        (pools, dir)
    }

    #[tokio::test]
    async fn start_new_session_sets_id() {
        let (pools, _dir) = temp_pools().await;
        let session_id: SessionId = Arc::new(Mutex::new(None));
        let id = start_new_session(&pools, &session_id).await.unwrap();
        assert!(id > 0);
        assert_eq!(*session_id.lock().unwrap(), Some(id));
    }

    #[tokio::test]
    async fn end_current_session_clears_id_and_writes_db() {
        let (pools, _dir) = temp_pools().await;
        let session_id: SessionId = Arc::new(Mutex::new(None));
        start_new_session(&pools, &session_id).await.unwrap();
        end_current_session(&pools, &session_id, "inactivity").await.unwrap();
        assert_eq!(*session_id.lock().unwrap(), None);

        let row: (Option<String>,) =
            sqlx::query_as("SELECT end_reason FROM sessions LIMIT 1")
                .fetch_one(pools.read.as_ref())
                .await
                .unwrap();
        assert_eq!(row.0.as_deref(), Some("inactivity"));
    }

    #[tokio::test]
    async fn handle_wake_ends_old_and_starts_new() {
        let (pools, _dir) = temp_pools().await;
        let session_id: SessionId = Arc::new(Mutex::new(None));
        let first_id = start_new_session(&pools, &session_id).await.unwrap();
        let new_id = handle_wake(&pools, &session_id).await.unwrap();

        assert_ne!(first_id, new_id);
        assert_eq!(*session_id.lock().unwrap(), Some(new_id));

        let row: (Option<String>,) =
            sqlx::query_as("SELECT end_reason FROM sessions WHERE id = ?")
                .bind(first_id)
                .fetch_one(pools.read.as_ref())
                .await
                .unwrap();
        assert_eq!(row.0.as_deref(), Some("wake"));
    }
}
