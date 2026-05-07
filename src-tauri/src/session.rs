use crate::classifier::{
    baseline::{load_baselines, update_baseline},
    daily_summary::DailySummaryAccumulator,
    local_date_and_time, time_of_day_bucket,
};
use crate::pipeline::ring_buffer::RingBuffer;
use crate::storage::DbPools;
use crate::storage::queries;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::time::{interval, Duration};

pub type SessionId = Arc<Mutex<Option<i64>>>;

/// Returns the current session's database ID without clearing it.
pub fn current_session_id(session_id: &SessionId) -> Option<i64> {
    *session_id.lock().unwrap()
}

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

/// Writes the session summary, daily summary, and (once per day) updates the EMA baseline.
/// Call after end_current_session. Pass the session's DB id (save it before calling
/// end_current_session, which clears the stored id).
pub async fn finalize_session(
    pools: &DbPools,
    summary_acc: &Arc<Mutex<DailySummaryAccumulator>>,
    ended_session_id: Option<i64>,
) {
    let now = now_ms() as u64;
    let (date, hour, dow) = local_date_and_time();
    let tod_bucket = time_of_day_bucket(hour);

    // Extract all data while holding the lock, then release before any await.
    let (write_params, daily_avgs, session_start_ms, burn_entries) = {
        let mut acc = summary_acc.lock().unwrap();
        acc.flush(now);
        let params = acc.write_params();
        let avgs = acc.session_averages(crate::pipeline::aggregator::AGGREGATION_SECS as f64);
        let start = acc.session_start_ms;
        let burns = acc.burn_entries;
        (params, avgs, start, burns)
    };

    let (total, focus, calm, deep, spark, burn, fade, rest, longest) = write_params;

    // ── Session summary ───────────────────────────────────────────────────────
    if let Some(sid) = ended_session_id {
        // Compute z-scores from raw session averages against the current baseline.
        let baselines = load_baselines(pools.read.as_ref(), tod_bucket, dow as i32)
            .await
            .unwrap_or_default();

        let z_score = |signal: &str| -> f64 {
            let val = match daily_avgs.get(signal) { Some(&v) => v, None => return 0.0 };
            let row = match baselines.get(signal) { Some(r) => r, None => return 0.0 };
            if row.ema_variance < 1e-9 { return 0.0; }
            (val - row.ema_mean) / row.ema_variance.sqrt()
        };

        // Build compact states JSON: {"focus":12,"deep":5,...} — skip zero-minute states.
        let states_json = {
            let mut pairs: Vec<String> = Vec::new();
            for (name, mins) in [
                ("focus", focus), ("calm", calm), ("deep", deep), ("spark", spark),
                ("burn", burn), ("fade", fade), ("rest", rest),
            ] {
                if mins > 0 { pairs.push(format!("\"{}\":{}", name, mins)); }
            }
            format!("{{{}}}", pairs.join(","))
        };

        // Insight count for this session (best effort — treat errors as 0).
        let insight_count = queries::get_daily_insight_count(
            pools.read.as_ref(), session_start_ms as i64,
        ).await.unwrap_or(0);

        if let Err(e) = queries::insert_session_summary(
            pools.write.as_ref(),
            sid,
            session_start_ms as i64,
            now as i64,
            total,
            &states_json,
            longest,
            z_score("typing_speed"),
            z_score("error_rate"),
            z_score("mouse_speed"),
            z_score("mouse_jitter"),
            z_score("pause_frequency"),
            z_score("app_switch_rate"),
            insight_count,
            burn_entries as i64,
            now as i64,
        ).await {
            tracing::warn!("[session] session summary write failed: {e}");
        }
    }

    // ── Daily summary ─────────────────────────────────────────────────────────
    if let Err(e) = queries::upsert_daily_summary(
        pools.write.as_ref(), &date,
        total, focus, calm, deep, spark, burn, fade, rest, longest, 1,
    ).await {
        tracing::error!("[session] daily summary write failed: {e}");
    }

    // ── Baseline update ───────────────────────────────────────────────────────
    let already = crate::classifier::baseline::already_updated_today(
        pools.read.as_ref(), tod_bucket, dow as i32,
    ).await.unwrap_or(false);

    if !already && !daily_avgs.is_empty() {
        match update_baseline(
            pools.read.as_ref(), pools.write.as_ref(),
            tod_bucket, dow as i32, &daily_avgs,
        ).await {
            Ok(_) => tracing::info!("[session] baseline updated"),
            Err(e) => tracing::error!("[session] baseline update failed: {e}"),
        }
    }

    // Reset accumulator so the next session starts clean.
    let new_start = now_ms() as u64;
    summary_acc.lock().unwrap().reset(new_start);
}

/// Polls every 60 seconds for inactivity. Ends the session if the ring buffer
/// has seen no events for 10 minutes (600,000 ms).
pub fn start_inactivity_watcher(
    ring: Arc<Mutex<RingBuffer>>,
    pools: DbPools,
    session_id: SessionId,
    summary_acc: Arc<Mutex<DailySummaryAccumulator>>,
) {
    tauri::async_runtime::spawn(async move {
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

            // None means the ring buffer has never received an event this session
            // (e.g. machine idle at startup). Treat as 0 idle time — don't end the
            // session until real activity has actually started and then lapsed.
            let idle_ms = match last_ts {
                Some(ts) => now_u64.saturating_sub(ts),
                None => 0,
            };

            if idle_ms >= 600_000 {
                let sid = current_session_id(&session_id);
                let _ = end_current_session(&pools, &session_id, "inactivity").await;
                finalize_session(&pools, &summary_acc, sid).await;
                if let Err(e) = start_new_session(&pools, &session_id).await {
                    tracing::error!("[session] failed to restart session after inactivity: {e}");
                }
                ring.lock().unwrap().reset_activity();
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage;
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
