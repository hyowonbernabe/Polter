use crate::storage::{DbReadPool, DbWritePool};
use crate::storage::queries::{get_baseline, upsert_baseline, BaselineRow};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

/// EMA alpha for a 14-day decay window: α = 1 − e^(−1/14) ≈ 0.069
const EMA_ALPHA: f64 = 0.069;

pub const SIGNAL_NAMES: &[&str] = &[
    "typing_speed", "error_rate", "app_switch_rate",
    "mouse_speed", "mouse_jitter", "pause_frequency", "single_window_hold",
    "undo_redo_rate", "key_hold_ms", "save_rate", "right_click_rate", "scroll_depth",
];

/// Session-averaged values per signal, keyed by signal name.
pub type DailyAverages = HashMap<String, f64>;

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

/// Loads all baseline rows for a given time bucket + day-of-week into a HashMap.
pub async fn load_baselines(
    pool: &DbReadPool,
    tod_bucket: i32,
    dow: i32,
) -> Result<HashMap<String, BaselineRow>, sqlx::Error> {
    let mut map = HashMap::new();
    for &sig in SIGNAL_NAMES {
        if let Some(row) = get_baseline(pool, sig, tod_bucket, dow).await? {
            map.insert(sig.to_string(), row);
        }
    }
    Ok(map)
}

/// Updates the EMA baseline for each signal present in `daily_avgs`.
/// On first insert (no existing row): stores the value directly.
/// On subsequent updates: applies EMA smoothing.
pub async fn update_baseline(
    read_pool: &DbReadPool,
    write_pool: &DbWritePool,
    tod_bucket: i32,
    dow: i32,
    daily_avgs: &DailyAverages,
) -> Result<(), sqlx::Error> {
    let now = now_ms();
    for &sig in SIGNAL_NAMES {
        let new_val = match daily_avgs.get(sig) {
            Some(&v) => v,
            None => continue,
        };
        let existing = get_baseline(read_pool, sig, tod_bucket, dow).await?;
        let (new_mean, new_variance, new_count) = match existing {
            None => (new_val, 0.0, 1i64),
            Some(row) => {
                let mean = EMA_ALPHA * new_val + (1.0 - EMA_ALPHA) * row.ema_mean;
                let diff = new_val - row.ema_mean;
                let variance = EMA_ALPHA * (diff * diff) + (1.0 - EMA_ALPHA) * row.ema_variance;
                (mean, variance, row.sample_count + 1)
            }
        };
        upsert_baseline(write_pool, sig, tod_bucket, dow, new_mean, new_variance, new_count, now)
            .await?;
    }
    Ok(())
}

/// Returns true if ANY baseline signal for this bucket was updated within the last 20 hours.
/// Checking all signals avoids a false negative when a particular signal was never written
/// (e.g. typing_speed on a mouse-only day) but other signals were.
pub async fn already_updated_today(
    pool: &DbReadPool,
    tod_bucket: i32,
    dow: i32,
) -> Result<bool, sqlx::Error> {
    let cutoff_ms = now_ms() - 20 * 60 * 60 * 1000;
    for &sig in SIGNAL_NAMES {
        if let Some(row) = get_baseline(pool, sig, tod_bucket, dow).await? {
            if row.last_updated_ms > cutoff_ms {
                return Ok(true);
            }
        }
    }
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage;
    use tempfile::TempDir;

    async fn temp_db() -> (storage::DbPools, TempDir) {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.db");
        let pools = storage::init(path.to_str().unwrap()).await.unwrap();
        (pools, dir)
    }

    fn avgs(typing_speed: f64) -> DailyAverages {
        let mut m = HashMap::new();
        m.insert("typing_speed".to_string(), typing_speed);
        m
    }

    #[tokio::test]
    async fn first_update_stores_value_directly() {
        let (pools, _dir) = temp_db().await;
        update_baseline(pools.read.as_ref(), pools.write.as_ref(), 1, 2, &avgs(3.0))
            .await.unwrap();
        let row = get_baseline(pools.read.as_ref(), "typing_speed", 1, 2)
            .await.unwrap().unwrap();
        assert!((row.ema_mean - 3.0).abs() < 0.001);
        assert_eq!(row.sample_count, 1);
    }

    #[tokio::test]
    async fn second_update_applies_ema_smoothing() {
        let (pools, _dir) = temp_db().await;
        update_baseline(pools.read.as_ref(), pools.write.as_ref(), 1, 2, &avgs(2.0))
            .await.unwrap();
        update_baseline(pools.read.as_ref(), pools.write.as_ref(), 1, 2, &avgs(4.0))
            .await.unwrap();
        let row = get_baseline(pools.read.as_ref(), "typing_speed", 1, 2)
            .await.unwrap().unwrap();
        let expected = EMA_ALPHA * 4.0 + (1.0 - EMA_ALPHA) * 2.0;
        assert!((row.ema_mean - expected).abs() < 0.001, "got {}", row.ema_mean);
        assert_eq!(row.sample_count, 2);
    }

    #[tokio::test]
    async fn variance_is_nonzero_after_spread() {
        let (pools, _dir) = temp_db().await;
        update_baseline(pools.read.as_ref(), pools.write.as_ref(), 1, 2, &avgs(1.0))
            .await.unwrap();
        update_baseline(pools.read.as_ref(), pools.write.as_ref(), 1, 2, &avgs(5.0))
            .await.unwrap();
        let row = get_baseline(pools.read.as_ref(), "typing_speed", 1, 2)
            .await.unwrap().unwrap();
        assert!(row.ema_variance > 0.0);
    }

    #[tokio::test]
    async fn skips_signals_not_in_daily_avgs() {
        let (pools, _dir) = temp_db().await;
        // Only typing_speed in avgs — error_rate should not be written
        update_baseline(pools.read.as_ref(), pools.write.as_ref(), 1, 2, &avgs(2.0))
            .await.unwrap();
        let row = get_baseline(pools.read.as_ref(), "error_rate", 1, 2)
            .await.unwrap();
        assert!(row.is_none());
    }
}
