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
}
