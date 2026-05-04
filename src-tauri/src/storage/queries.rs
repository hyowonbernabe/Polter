use crate::pipeline::aggregator::BehavioralSnapshot;
use crate::storage::{DbReadPool, DbWritePool};
use sqlx::Row;

pub async fn start_session(pool: &DbWritePool, start_time_ms: i64) -> Result<i64, sqlx::Error> {
    let row: (i64,) = sqlx::query_as(
        "INSERT INTO sessions (start_time, state_summary) VALUES (?, '{}') RETURNING id",
    )
    .bind(start_time_ms)
    .fetch_one(pool)
    .await?;
    Ok(row.0)
}

pub async fn end_session(
    pool: &DbWritePool,
    session_id: i64,
    end_time_ms: i64,
    end_reason: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE sessions SET end_time = ?, end_reason = ? WHERE id = ?")
        .bind(end_time_ms)
        .bind(end_reason)
        .bind(session_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn insert_snapshot(
    pool: &DbWritePool,
    snap: &BehavioralSnapshot,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO behavioral_snapshots
            (session_id, timestamp, typing_speed, error_rate, pause_count,
             mouse_speed, mouse_jitter, click_count, scroll_count,
             cpu_percent, ram_percent, battery_percent, on_battery,
             window_count, foreground_app, app_switch_count, single_window_hold_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(snap.session_id)
    .bind(snap.timestamp_ms)
    .bind(snap.typing_speed)
    .bind(snap.error_rate)
    .bind(snap.pause_count)
    .bind(snap.mouse_speed)
    .bind(snap.mouse_jitter)
    .bind(snap.click_count)
    .bind(snap.scroll_count)
    .bind(snap.cpu_percent)
    .bind(snap.ram_percent)
    .bind(snap.battery_percent)
    .bind(snap.on_battery as i32)
    .bind(snap.window_count)
    .bind(&snap.foreground_app)
    .bind(snap.app_switch_count)
    .bind(snap.single_window_hold_ms)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn latest_snapshot_for_session(
    pool: &DbReadPool,
    session_id: i64,
) -> Result<Option<BehavioralSnapshot>, sqlx::Error> {
    let row = sqlx::query(
        r#"SELECT session_id, timestamp, typing_speed, error_rate, pause_count,
                  mouse_speed, mouse_jitter, click_count, scroll_count,
                  cpu_percent, ram_percent, battery_percent, on_battery,
                  window_count, foreground_app, app_switch_count, single_window_hold_ms
           FROM behavioral_snapshots
           WHERE session_id = ?
           ORDER BY timestamp DESC
           LIMIT 1"#,
    )
    .bind(session_id)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| BehavioralSnapshot {
        session_id:            r.get::<i64, _>(0),
        timestamp_ms:          r.get::<i64, _>(1),
        typing_speed:          r.get::<f64, _>(2),
        error_rate:            r.get::<f64, _>(3),
        pause_count:           r.get::<i64, _>(4) as i32,
        mouse_speed:           r.get::<f64, _>(5),
        mouse_jitter:          r.get::<f64, _>(6),
        click_count:           r.get::<i64, _>(7) as i32,
        scroll_count:          r.get::<i64, _>(8) as i32,
        cpu_percent:           r.get::<f64, _>(9) as f32,
        ram_percent:           r.get::<f64, _>(10) as f32,
        battery_percent:       r.get::<i64, _>(11) as i32,
        on_battery:            r.get::<i64, _>(12) != 0,
        window_count:          r.get::<i64, _>(13) as i32,
        foreground_app:        r.get::<String, _>(14),
        app_switch_count:      r.get::<i64, _>(15) as i32,
        single_window_hold_ms: r.get::<i64, _>(16),
    }))
}

// ── Baseline ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct BaselineRow {
    pub signal: String,
    pub time_of_day_bucket: i32,
    pub day_of_week: i32,
    pub ema_mean: f64,
    pub ema_variance: f64,
    pub sample_count: i64,
    pub last_updated_ms: i64,
}

pub async fn upsert_baseline(
    pool: &DbWritePool,
    signal: &str,
    time_of_day_bucket: i32,
    day_of_week: i32,
    ema_mean: f64,
    ema_variance: f64,
    sample_count: i64,
    last_updated_ms: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO baseline
               (signal, time_of_day_bucket, day_of_week, ema_mean, ema_variance, sample_count, last_updated_ms)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(signal, time_of_day_bucket, day_of_week) DO UPDATE SET
               ema_mean        = excluded.ema_mean,
               ema_variance    = excluded.ema_variance,
               sample_count    = excluded.sample_count,
               last_updated_ms = excluded.last_updated_ms"#,
    )
    .bind(signal)
    .bind(time_of_day_bucket)
    .bind(day_of_week)
    .bind(ema_mean)
    .bind(ema_variance)
    .bind(sample_count)
    .bind(last_updated_ms)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_baseline(
    pool: &DbReadPool,
    signal: &str,
    time_of_day_bucket: i32,
    day_of_week: i32,
) -> Result<Option<BaselineRow>, sqlx::Error> {
    let row = sqlx::query(
        "SELECT signal, time_of_day_bucket, day_of_week, ema_mean, ema_variance,
                sample_count, last_updated_ms
         FROM baseline
         WHERE signal = ? AND time_of_day_bucket = ? AND day_of_week = ?",
    )
    .bind(signal)
    .bind(time_of_day_bucket)
    .bind(day_of_week)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|r| {
        use sqlx::Row;
        BaselineRow {
            signal:             r.get(0),
            time_of_day_bucket: r.get::<i64, _>(1) as i32,
            day_of_week:        r.get::<i64, _>(2) as i32,
            ema_mean:           r.get(3),
            ema_variance:       r.get(4),
            sample_count:       r.get(5),
            last_updated_ms:    r.get(6),
        }
    }))
}

// ── Daily Summaries ───────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct DailySummaryRow {
    pub date: String,
    pub total_active_minutes: i64,
    pub focus_minutes: i64,
    pub calm_minutes: i64,
    pub deep_minutes: i64,
    pub spark_minutes: i64,
    pub burn_minutes: i64,
    pub fade_minutes: i64,
    pub rest_minutes: i64,
    pub longest_focus_block_minutes: i64,
    pub session_count: i64,
}

#[allow(clippy::too_many_arguments)]
pub async fn upsert_daily_summary(
    pool: &DbWritePool,
    date: &str,
    total_active_minutes: i64,
    focus_minutes: i64,
    calm_minutes: i64,
    deep_minutes: i64,
    spark_minutes: i64,
    burn_minutes: i64,
    fade_minutes: i64,
    rest_minutes: i64,
    longest_focus_block_minutes: i64,
    session_count: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO daily_summaries
               (date, total_active_minutes, focus_minutes, calm_minutes, deep_minutes,
                spark_minutes, burn_minutes, fade_minutes, rest_minutes,
                longest_focus_block_minutes, session_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(date) DO UPDATE SET
               total_active_minutes        = total_active_minutes        + excluded.total_active_minutes,
               focus_minutes               = focus_minutes               + excluded.focus_minutes,
               calm_minutes                = calm_minutes                + excluded.calm_minutes,
               deep_minutes                = deep_minutes                + excluded.deep_minutes,
               spark_minutes               = spark_minutes               + excluded.spark_minutes,
               burn_minutes                = burn_minutes                + excluded.burn_minutes,
               fade_minutes                = fade_minutes                + excluded.fade_minutes,
               rest_minutes                = rest_minutes                + excluded.rest_minutes,
               longest_focus_block_minutes = MAX(longest_focus_block_minutes, excluded.longest_focus_block_minutes),
               session_count               = session_count               + excluded.session_count"#,
    )
    .bind(date)
    .bind(total_active_minutes)
    .bind(focus_minutes)
    .bind(calm_minutes)
    .bind(deep_minutes)
    .bind(spark_minutes)
    .bind(burn_minutes)
    .bind(fade_minutes)
    .bind(rest_minutes)
    .bind(longest_focus_block_minutes)
    .bind(session_count)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_daily_summary(
    pool: &DbReadPool,
    date: &str,
) -> Result<Option<DailySummaryRow>, sqlx::Error> {
    let row = sqlx::query(
        "SELECT date, total_active_minutes, focus_minutes, calm_minutes, deep_minutes,
                spark_minutes, burn_minutes, fade_minutes, rest_minutes,
                longest_focus_block_minutes, session_count
         FROM daily_summaries WHERE date = ?",
    )
    .bind(date)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|r| {
        use sqlx::Row;
        DailySummaryRow {
            date:                        r.get(0),
            total_active_minutes:        r.get(1),
            focus_minutes:               r.get(2),
            calm_minutes:                r.get(3),
            deep_minutes:                r.get(4),
            spark_minutes:               r.get(5),
            burn_minutes:                r.get(6),
            fade_minutes:                r.get(7),
            rest_minutes:                r.get(8),
            longest_focus_block_minutes: r.get(9),
            session_count:               r.get(10),
        }
    }))
}

pub async fn get_first_session_ms(pool: &DbReadPool) -> Result<Option<i64>, sqlx::Error> {
    let row = sqlx::query("SELECT MIN(start_time) FROM sessions")
        .fetch_one(pool)
        .await?;
    use sqlx::Row;
    Ok(row.get::<Option<i64>, _>(0))
}

pub async fn get_last_session_end_ms(pool: &DbReadPool) -> Result<Option<i64>, sqlx::Error> {
    let row: Option<(Option<i64>,)> = sqlx::query_as(
        "SELECT end_time FROM sessions WHERE end_time IS NOT NULL ORDER BY end_time DESC LIMIT 1"
    )
    .fetch_optional(pool)
    .await?;
    Ok(row.and_then(|(ms,)| ms))
}

pub async fn get_longest_focus_block_ms(pool: &DbReadPool) -> Result<i64, sqlx::Error> {
    let row: (Option<i64>,) = sqlx::query_as(
        "SELECT MAX(longest_focus_block_minutes) FROM daily_summaries"
    )
    .fetch_one(pool)
    .await?;
    Ok(row.0.unwrap_or(0) * 60_000)
}

// ── Insights ──────────────────────────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
pub async fn insert_insight(
    pool: &DbWritePool,
    timestamp_ms: i64,
    session_id: Option<i64>,
    state: &str,
    insight_text: &str,
    extended_text: &str,
    insight_type: &str,
) -> Result<i64, sqlx::Error> {
    let row: (i64,) = sqlx::query_as(
        r#"INSERT INTO insights
               (timestamp, session_id, state, insight_text, extended_text, insight_type)
           VALUES (?, ?, ?, ?, ?, ?) RETURNING id"#,
    )
    .bind(timestamp_ms)
    .bind(session_id)
    .bind(state)
    .bind(insight_text)
    .bind(extended_text)
    .bind(insight_type)
    .fetch_one(pool)
    .await?;
    Ok(row.0)
}

pub async fn get_daily_insight_count(
    pool: &DbReadPool,
    day_start_ms: i64,
) -> Result<i64, sqlx::Error> {
    let row: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM insights WHERE timestamp >= ?",
    )
    .bind(day_start_ms)
    .fetch_one(pool)
    .await?;
    Ok(row.0)
}

pub async fn get_dedup_count_48h(
    pool: &DbReadPool,
    insight_type: &str,
    now_ms: u64,
) -> Result<i64, sqlx::Error> {
    let cutoff = now_ms.saturating_sub(48 * 60 * 60 * 1_000) as i64;
    let row: Option<(i64, i64)> = sqlx::query_as(
        "SELECT count_in_48h, last_seen_ms FROM insight_dedup_log WHERE insight_type = ?",
    )
    .bind(insight_type)
    .fetch_optional(pool)
    .await?;
    Ok(match row {
        Some((count, last_seen)) if last_seen >= cutoff => count,
        _ => 0,
    })
}

pub async fn upsert_dedup_entry(
    pool: &DbWritePool,
    insight_type: &str,
    now_ms: i64,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO insight_dedup_log (insight_type, last_seen_ms, count_in_48h)
           VALUES (?, ?, 1)
           ON CONFLICT(insight_type) DO UPDATE SET
               count_in_48h = CASE
                   WHEN (? - last_seen_ms) >= 172800000 THEN 1
                   ELSE count_in_48h + 1
               END,
               last_seen_ms = ?"#,
    )
    .bind(insight_type)
    .bind(now_ms)
    .bind(now_ms)
    .bind(now_ms)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_total_insight_count(pool: &DbReadPool) -> Result<i64, sqlx::Error> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM insights")
        .fetch_one(pool)
        .await?;
    Ok(row.0)
}

// ── Dashboard queries ─────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct InsightRow {
    pub id: i64,
    pub timestamp: i64,
    pub state: String,
    pub insight_text: String,
    pub extended_text: String,
    pub insight_type: String,
}

pub async fn get_last_7_daily_summaries(pool: &DbReadPool) -> Result<Vec<DailySummaryRow>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT date, total_active_minutes, focus_minutes, calm_minutes, deep_minutes,
                spark_minutes, burn_minutes, fade_minutes, rest_minutes,
                longest_focus_block_minutes, session_count
         FROM daily_summaries
         ORDER BY date DESC
         LIMIT 7",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(|r| {
        use sqlx::Row;
        DailySummaryRow {
            date:                        r.get(0),
            total_active_minutes:        r.get(1),
            focus_minutes:               r.get(2),
            calm_minutes:                r.get(3),
            deep_minutes:                r.get(4),
            spark_minutes:               r.get(5),
            burn_minutes:                r.get(6),
            fade_minutes:                r.get(7),
            rest_minutes:                r.get(8),
            longest_focus_block_minutes: r.get(9),
            session_count:               r.get(10),
        }
    }).collect())
}

pub async fn get_recent_insights(pool: &DbReadPool, limit: i64) -> Result<Vec<InsightRow>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, timestamp, state, insight_text, extended_text, insight_type
         FROM insights
         ORDER BY timestamp DESC
         LIMIT ?",
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(|r| {
        use sqlx::Row;
        InsightRow {
            id:           r.get(0),
            timestamp:    r.get(1),
            state:        r.get(2),
            insight_text: r.get(3),
            extended_text: r.get(4),
            insight_type: r.get(5),
        }
    }).collect())
}

pub async fn get_best_day_this_week_minutes(pool: &DbReadPool) -> Result<i64, sqlx::Error> {
    let row: (Option<i64>,) = sqlx::query_as(
        "SELECT MAX(total_active_minutes) FROM (
             SELECT total_active_minutes FROM daily_summaries ORDER BY date DESC LIMIT 7
         )",
    )
    .fetch_one(pool)
    .await?;
    Ok(row.0.unwrap_or(0))
}

// ── Tests ──────────────────────────────────────────────────────────────────────

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

    fn make_snap(session_id: i64) -> BehavioralSnapshot {
        BehavioralSnapshot {
            session_id,
            timestamp_ms: 1_000_000,
            typing_speed: 1.5,
            error_rate: 0.1,
            pause_count: 2,
            mouse_speed: 300.0,
            mouse_jitter: 10.0,
            click_count: 5,
            scroll_count: 3,
            cpu_percent: 25.0,
            ram_percent: 60.0,
            battery_percent: 80,
            on_battery: false,
            window_count: 7,
            foreground_app: "code.exe".to_string(),
            app_switch_count: 4,
            single_window_hold_ms: 12_000,
        }
    }

    #[tokio::test]
    async fn start_session_returns_valid_id() {
        let (pools, _dir) = temp_db().await;
        let id = start_session(pools.write.as_ref(), 1_000_000).await.unwrap();
        assert!(id > 0);
    }

    #[tokio::test]
    async fn end_session_sets_fields() {
        let (pools, _dir) = temp_db().await;
        let id = start_session(pools.write.as_ref(), 1_000_000).await.unwrap();
        end_session(pools.write.as_ref(), id, 2_000_000, "inactivity").await.unwrap();

        let row: (Option<i64>, Option<String>) =
            sqlx::query_as("SELECT end_time, end_reason FROM sessions WHERE id = ?")
                .bind(id)
                .fetch_one(pools.read.as_ref())
                .await
                .unwrap();
        assert_eq!(row.0, Some(2_000_000));
        assert_eq!(row.1.as_deref(), Some("inactivity"));
    }

    #[tokio::test]
    async fn insert_snapshot_stores_all_fields() {
        let (pools, _dir) = temp_db().await;
        let session_id = start_session(pools.write.as_ref(), 1_000_000).await.unwrap();
        let snap = make_snap(session_id);
        insert_snapshot(pools.write.as_ref(), &snap).await.unwrap();

        let row: (f64, f64, i64, f64, f64, i64, i64, f64, f64, i64, i64, i64, String, i64, i64) =
            sqlx::query_as(
                "SELECT typing_speed, error_rate, pause_count, mouse_speed, mouse_jitter,
                        click_count, scroll_count, cpu_percent, ram_percent,
                        battery_percent, on_battery, window_count, foreground_app,
                        app_switch_count, single_window_hold_ms
                 FROM behavioral_snapshots WHERE session_id = ?",
            )
            .bind(session_id)
            .fetch_one(pools.read.as_ref())
            .await
            .unwrap();
        let (typing_speed, error_rate, pause_count, mouse_speed, mouse_jitter,
             click_count, scroll_count, cpu_percent, ram_percent,
             battery_percent, on_battery, window_count, foreground_app,
             app_switch_count, single_window_hold_ms) = row;
        assert!((typing_speed - 1.5).abs() < 0.001);
        assert!((error_rate - 0.1).abs() < 0.001);
        assert_eq!(pause_count, 2);
        assert!((mouse_speed - 300.0).abs() < 0.001);
        assert!((mouse_jitter - 10.0).abs() < 0.001);
        assert_eq!(click_count, 5);
        assert_eq!(scroll_count, 3);
        assert!((cpu_percent - 25.0).abs() < 0.001);
        assert!((ram_percent - 60.0).abs() < 0.001);
        assert_eq!(battery_percent, 80);
        assert_eq!(on_battery, 0);
        assert_eq!(window_count, 7);
        assert_eq!(foreground_app, "code.exe");
        assert_eq!(app_switch_count, 4);
        assert_eq!(single_window_hold_ms, 12_000);
    }

    #[tokio::test]
    async fn latest_snapshot_returns_most_recent() {
        let (pools, _dir) = temp_db().await;
        let session_id = start_session(pools.write.as_ref(), 1_000_000).await.unwrap();

        let mut snap1 = make_snap(session_id);
        snap1.timestamp_ms = 1_000_000;
        snap1.typing_speed = 0.5;
        insert_snapshot(pools.write.as_ref(), &snap1).await.unwrap();

        let mut snap2 = make_snap(session_id);
        snap2.timestamp_ms = 2_000_000;
        snap2.typing_speed = 2.5;
        insert_snapshot(pools.write.as_ref(), &snap2).await.unwrap();

        let result = latest_snapshot_for_session(pools.read.as_ref(), session_id)
            .await
            .unwrap()
            .unwrap();
        assert!((result.typing_speed - 2.5).abs() < 0.01);
        assert_eq!(result.timestamp_ms, 2_000_000);
    }

    #[tokio::test]
    async fn upsert_and_get_baseline() {
        let (pools, _dir) = temp_db().await;
        upsert_baseline(pools.write.as_ref(), "typing_speed", 1, 3, 1.5, 0.64, 10, 1_000_000)
            .await.unwrap();
        let row = get_baseline(pools.read.as_ref(), "typing_speed", 1, 3)
            .await.unwrap().unwrap();
        assert!((row.ema_mean - 1.5).abs() < 0.001);
        assert!((row.ema_variance - 0.64).abs() < 0.001);
        assert_eq!(row.sample_count, 10);

        upsert_baseline(pools.write.as_ref(), "typing_speed", 1, 3, 2.0, 0.81, 11, 2_000_000)
            .await.unwrap();
        let row2 = get_baseline(pools.read.as_ref(), "typing_speed", 1, 3)
            .await.unwrap().unwrap();
        assert!((row2.ema_mean - 2.0).abs() < 0.001);
    }

    #[tokio::test]
    async fn get_baseline_returns_none_for_missing() {
        let (pools, _dir) = temp_db().await;
        let result = get_baseline(pools.read.as_ref(), "typing_speed", 0, 0)
            .await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn upsert_daily_summary_accumulates() {
        let (pools, _dir) = temp_db().await;
        upsert_daily_summary(
            pools.write.as_ref(), "2026-05-04",
            30, 10, 5, 8, 3, 2, 1, 1, 12, 1,
        ).await.unwrap();
        let row = get_daily_summary(pools.read.as_ref(), "2026-05-04")
            .await.unwrap().unwrap();
        assert_eq!(row.total_active_minutes, 30);
        assert_eq!(row.session_count, 1);

        upsert_daily_summary(
            pools.write.as_ref(), "2026-05-04",
            20, 5, 3, 4, 2, 1, 1, 4, 15, 1,
        ).await.unwrap();
        let row2 = get_daily_summary(pools.read.as_ref(), "2026-05-04")
            .await.unwrap().unwrap();
        assert_eq!(row2.total_active_minutes, 50);
        assert_eq!(row2.session_count, 2);
        assert_eq!(row2.longest_focus_block_minutes, 15);
    }

    #[tokio::test]
    async fn get_first_session_ms_returns_none_on_empty() {
        let (pools, _dir) = temp_db().await;
        let result = get_first_session_ms(pools.read.as_ref()).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn get_first_session_ms_returns_earliest() {
        let (pools, _dir) = temp_db().await;
        start_session(pools.write.as_ref(), 5_000_000).await.unwrap();
        start_session(pools.write.as_ref(), 1_000_000).await.unwrap();
        start_session(pools.write.as_ref(), 9_000_000).await.unwrap();
        let first = get_first_session_ms(pools.read.as_ref()).await.unwrap();
        assert_eq!(first, Some(1_000_000));
    }

    #[tokio::test]
    async fn get_last_session_end_ms_returns_none_on_empty() {
        let (pools, _dir) = temp_db().await;
        let result = get_last_session_end_ms(pools.read.as_ref()).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn get_last_session_end_ms_returns_most_recent() {
        let (pools, _dir) = temp_db().await;
        let id1 = start_session(pools.write.as_ref(), 1_000_000).await.unwrap();
        end_session(pools.write.as_ref(), id1, 2_000_000, "inactivity").await.unwrap();
        let id2 = start_session(pools.write.as_ref(), 3_000_000).await.unwrap();
        end_session(pools.write.as_ref(), id2, 5_000_000, "inactivity").await.unwrap();
        let result = get_last_session_end_ms(pools.read.as_ref()).await.unwrap();
        assert_eq!(result, Some(5_000_000));
    }

    #[tokio::test]
    async fn get_last_session_end_ms_ignores_active_sessions() {
        let (pools, _dir) = temp_db().await;
        let id1 = start_session(pools.write.as_ref(), 1_000_000).await.unwrap();
        end_session(pools.write.as_ref(), id1, 2_000_000, "inactivity").await.unwrap();
        start_session(pools.write.as_ref(), 3_000_000).await.unwrap();
        let result = get_last_session_end_ms(pools.read.as_ref()).await.unwrap();
        assert_eq!(result, Some(2_000_000));
    }

    #[tokio::test]
    async fn get_longest_focus_block_ms_returns_zero_on_empty() {
        let (pools, _dir) = temp_db().await;
        let result = get_longest_focus_block_ms(pools.read.as_ref()).await.unwrap();
        assert_eq!(result, 0);
    }

    #[tokio::test]
    async fn get_longest_focus_block_ms_returns_max_across_days() {
        let (pools, _dir) = temp_db().await;
        upsert_daily_summary(
            pools.write.as_ref(), "2026-05-01",
            60, 30, 10, 10, 5, 3, 1, 1, 20, 1,
        ).await.unwrap();
        upsert_daily_summary(
            pools.write.as_ref(), "2026-05-02",
            45, 25, 5, 8, 3, 2, 1, 1, 35, 1,
        ).await.unwrap();
        // MAX(20, 35) = 35 minutes = 35 * 60_000 = 2_100_000 ms
        let result = get_longest_focus_block_ms(pools.read.as_ref()).await.unwrap();
        assert_eq!(result, 2_100_000);
    }

    #[tokio::test]
    async fn insert_insight_and_daily_count() {
        let (pools, _dir) = temp_db().await;
        insert_insight(pools.write.as_ref(), 1_000_000, None, "focus", "something noticed.", "more detail.", "flow_detection")
            .await.unwrap();
        insert_insight(pools.write.as_ref(), 2_000_000, None, "burn", "another observation.", "even more.", "fatigue_signal")
            .await.unwrap();
        let count = get_daily_insight_count(pools.read.as_ref(), 0).await.unwrap();
        assert_eq!(count, 2);
        // Only count from after the first insight
        let count2 = get_daily_insight_count(pools.read.as_ref(), 1_500_000).await.unwrap();
        assert_eq!(count2, 1);
    }

    #[tokio::test]
    async fn dedup_count_zero_on_fresh() {
        let (pools, _dir) = temp_db().await;
        let count = get_dedup_count_48h(pools.read.as_ref(), "flow_detection", 1_000_000)
            .await.unwrap();
        assert_eq!(count, 0);
    }

    #[tokio::test]
    async fn upsert_dedup_increments_count() {
        let (pools, _dir) = temp_db().await;
        let now_ms: u64 = 1_000_000_000;
        upsert_dedup_entry(pools.write.as_ref(), "flow_detection", now_ms as i64).await.unwrap();
        let count = get_dedup_count_48h(pools.read.as_ref(), "flow_detection", now_ms).await.unwrap();
        assert_eq!(count, 1);

        // Second occurrence
        let later = now_ms + 3600_000; // 1 hour later
        upsert_dedup_entry(pools.write.as_ref(), "flow_detection", later as i64).await.unwrap();
        let count2 = get_dedup_count_48h(pools.read.as_ref(), "flow_detection", later).await.unwrap();
        assert_eq!(count2, 2);
    }

    #[tokio::test]
    async fn dedup_count_resets_after_48h() {
        let (pools, _dir) = temp_db().await;
        let old_ms: i64 = 1_000_000;
        upsert_dedup_entry(pools.write.as_ref(), "anomaly", old_ms).await.unwrap();
        upsert_dedup_entry(pools.write.as_ref(), "anomaly", old_ms).await.unwrap();
        // Query from 48h + 1ms later — count should reset
        let now_ms: u64 = old_ms as u64 + 48 * 60 * 60 * 1_000 + 1;
        let count = get_dedup_count_48h(pools.read.as_ref(), "anomaly", now_ms).await.unwrap();
        assert_eq!(count, 0);
    }

    #[tokio::test]
    async fn get_total_insight_count_returns_zero_on_empty() {
        let (pools, _dir) = temp_db().await;
        let count = get_total_insight_count(pools.read.as_ref()).await.unwrap();
        assert_eq!(count, 0);
    }

    #[tokio::test]
    async fn get_total_insight_count_increments_after_insert() {
        let (pools, _dir) = temp_db().await;
        insert_insight(pools.write.as_ref(), 1_000, None, "focus", "a.", "b.", "anomaly").await.unwrap();
        let count = get_total_insight_count(pools.read.as_ref()).await.unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn get_last_7_daily_summaries_returns_empty_on_empty_db() {
        let (pools, _dir) = temp_db().await;
        let rows = get_last_7_daily_summaries(pools.read.as_ref()).await.unwrap();
        assert!(rows.is_empty());
    }

    #[tokio::test]
    async fn get_last_7_daily_summaries_returns_at_most_7() {
        let (pools, _dir) = temp_db().await;
        for day in 1..=10u32 {
            let date = format!("2026-05-{:02}", day);
            upsert_daily_summary(pools.write.as_ref(), &date, 30, 10, 5, 8, 3, 2, 1, 1, 12, 1)
                .await.unwrap();
        }
        let rows = get_last_7_daily_summaries(pools.read.as_ref()).await.unwrap();
        assert_eq!(rows.len(), 7);
    }

    #[tokio::test]
    async fn get_last_7_daily_summaries_ordered_most_recent_first() {
        let (pools, _dir) = temp_db().await;
        upsert_daily_summary(pools.write.as_ref(), "2026-05-01", 10, 5, 2, 2, 0, 0, 0, 1, 5, 1).await.unwrap();
        upsert_daily_summary(pools.write.as_ref(), "2026-05-02", 20, 8, 3, 4, 1, 1, 1, 2, 8, 1).await.unwrap();
        upsert_daily_summary(pools.write.as_ref(), "2026-05-03", 30, 12, 4, 6, 2, 2, 2, 2, 10, 1).await.unwrap();
        let rows = get_last_7_daily_summaries(pools.read.as_ref()).await.unwrap();
        assert_eq!(rows[0].date, "2026-05-03");
        assert_eq!(rows[1].date, "2026-05-02");
        assert_eq!(rows[2].date, "2026-05-01");
    }

    #[tokio::test]
    async fn get_recent_insights_returns_empty_on_empty_db() {
        let (pools, _dir) = temp_db().await;
        let rows = get_recent_insights(pools.read.as_ref(), 10).await.unwrap();
        assert!(rows.is_empty());
    }

    #[tokio::test]
    async fn get_recent_insights_respects_limit() {
        let (pools, _dir) = temp_db().await;
        for i in 0..5i64 {
            insert_insight(pools.write.as_ref(), i * 1_000, None, "focus", "text", "ext", "type_a")
                .await.unwrap();
        }
        let rows = get_recent_insights(pools.read.as_ref(), 3).await.unwrap();
        assert_eq!(rows.len(), 3);
        // most recent first
        assert!(rows[0].timestamp > rows[1].timestamp);
    }

    #[tokio::test]
    async fn get_recent_insights_fields_populated() {
        let (pools, _dir) = temp_db().await;
        insert_insight(pools.write.as_ref(), 9_000, None, "spark", "hello", "world", "flow")
            .await.unwrap();
        let rows = get_recent_insights(pools.read.as_ref(), 1).await.unwrap();
        let row = &rows[0];
        assert_eq!(row.state, "spark");
        assert_eq!(row.insight_text, "hello");
        assert_eq!(row.extended_text, "world");
        assert_eq!(row.insight_type, "flow");
        assert_eq!(row.timestamp, 9_000);
    }

    #[tokio::test]
    async fn get_best_day_this_week_minutes_returns_zero_on_empty() {
        let (pools, _dir) = temp_db().await;
        let result = get_best_day_this_week_minutes(pools.read.as_ref()).await.unwrap();
        assert_eq!(result, 0);
    }

    #[tokio::test]
    async fn get_best_day_this_week_minutes_returns_max_of_last_7_days() {
        let (pools, _dir) = temp_db().await;
        upsert_daily_summary(pools.write.as_ref(), "2026-04-27", 10, 5, 2, 2, 0, 0, 0, 1, 5, 1).await.unwrap();
        upsert_daily_summary(pools.write.as_ref(), "2026-04-28", 55, 20, 5, 10, 5, 5, 5, 5, 20, 1).await.unwrap();
        upsert_daily_summary(pools.write.as_ref(), "2026-04-29", 40, 15, 5, 8, 3, 3, 3, 3, 15, 1).await.unwrap();
        let result = get_best_day_this_week_minutes(pools.read.as_ref()).await.unwrap();
        assert_eq!(result, 55);
    }
}
