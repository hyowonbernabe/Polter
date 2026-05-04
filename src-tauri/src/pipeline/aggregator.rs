use crate::classifier::{
    anomaly::AnomalyDetector,
    baseline,
    daily_summary::DailySummaryAccumulator,
    signals::compute_z_scores,
    state_machine::StateMachine,
    is_cold_start, local_time_parts, time_of_day_bucket,
};
use crate::pipeline::ring_buffer::{RawInputEvent, RingBuffer};
use crate::sensors::system::SystemSnapshot;
use crate::storage::{DbPools, queries::get_first_session_ms};
use std::sync::{Arc, Mutex, RwLock};
use tauri::Emitter;

// ── Output type ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct BehavioralSnapshot {
    pub session_id: i64,
    pub timestamp_ms: i64,
    pub typing_speed: f64,
    pub error_rate: f64,
    pub pause_count: i32,
    pub mouse_speed: f64,
    pub mouse_jitter: f64,
    pub click_count: i32,
    pub scroll_count: i32,
    pub cpu_percent: f32,
    pub ram_percent: f32,
    pub battery_percent: i32,
    pub on_battery: bool,
    pub window_count: i32,
    pub foreground_app: String,
    pub app_switch_count: i32,
    pub single_window_hold_ms: i64,
}

// ── Pure computation ──────────────────────────────────────────────────────────

pub fn compute_snapshot(
    events: &[RawInputEvent],
    system: &SystemSnapshot,
    session_id: i64,
    window_end_ms: u64,
    window_duration_secs: f64,
) -> BehavioralSnapshot {
    // Keyboard
    let mut total_keys: i32 = 0;
    let mut deletions: i32 = 0;
    for e in events {
        if let RawInputEvent::KeyDown { is_deletion, .. } = e {
            total_keys += 1;
            if *is_deletion {
                deletions += 1;
            }
        }
    }
    let typing_speed = if window_duration_secs > 0.0 {
        total_keys as f64 / window_duration_secs
    } else {
        0.0
    };
    let error_rate = if total_keys > 0 {
        deletions as f64 / total_keys as f64
    } else {
        0.0
    };

    // Pauses: gaps > 2000 ms between consecutive events
    let mut all_ts: Vec<u64> = events.iter().map(|e| e.ts_ms()).collect();
    all_ts.sort_unstable();
    let pause_count = all_ts
        .windows(2)
        .filter(|w| w[1].saturating_sub(w[0]) > 2000)
        .count() as i32;

    // Mouse speed + jitter
    let moves: Vec<(f64, f64, u64)> = events
        .iter()
        .filter_map(|e| {
            if let RawInputEvent::MouseMove { x, y, ts_ms } = e {
                Some((*x, *y, *ts_ms))
            } else {
                None
            }
        })
        .collect();

    let speeds: Vec<f64> = moves
        .windows(2)
        .filter_map(|w| {
            let dt_s = (w[1].2.saturating_sub(w[0].2)) as f64 / 1000.0;
            if dt_s <= 0.0 {
                return None;
            }
            let dx = w[1].0 - w[0].0;
            let dy = w[1].1 - w[0].1;
            Some(((dx * dx + dy * dy).sqrt()) / dt_s)
        })
        .collect();

    let mouse_speed = if !speeds.is_empty() {
        speeds.iter().sum::<f64>() / speeds.len() as f64
    } else {
        0.0
    };
    let mouse_jitter = if speeds.len() > 1 {
        let mean = mouse_speed;
        let variance = speeds.iter().map(|s| (s - mean).powi(2)).sum::<f64>()
            / speeds.len() as f64;
        variance.sqrt()
    } else {
        0.0
    };

    let click_count = events
        .iter()
        .filter(|e| matches!(e, RawInputEvent::MouseClick { .. }))
        .count() as i32;
    let scroll_count = events
        .iter()
        .filter(|e| matches!(e, RawInputEvent::Scroll { .. }))
        .count() as i32;

    BehavioralSnapshot {
        session_id,
        timestamp_ms: window_end_ms as i64,
        typing_speed,
        error_rate,
        pause_count,
        mouse_speed,
        mouse_jitter,
        click_count,
        scroll_count,
        cpu_percent: system.cpu_percent,
        ram_percent: system.ram_percent,
        battery_percent: system.battery_percent,
        on_battery: system.on_battery,
        window_count: system.window_count,
        foreground_app: system.foreground_app.clone(),
        app_switch_count: system.app_switch_count,
        single_window_hold_ms: system.single_window_hold_ms,
    }
}

// ── Aggregation task ──────────────────────────────────────────────────────────

pub const AGGREGATION_SECS: u64 = 60;

#[derive(serde::Serialize, Clone)]
struct StateChangedPayload {
    state: String,
    cold_start: bool,
}

pub fn start<R: tauri::Runtime>(
    ring: Arc<Mutex<RingBuffer>>,
    system: Arc<RwLock<SystemSnapshot>>,
    session_id: Arc<Mutex<Option<i64>>>,
    pools: DbPools,
    app_handle: tauri::AppHandle<R>,
    state_machine: Arc<Mutex<StateMachine>>,
    anomaly_detector: Arc<Mutex<AnomalyDetector>>,
    summary_acc: Arc<Mutex<DailySummaryAccumulator>>,
) {
    use std::time::{Duration, SystemTime, UNIX_EPOCH};
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(AGGREGATION_SECS));
        interval.tick().await;
        loop {
            interval.tick().await;
            let window_end_ms = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            let sid = *session_id.lock().unwrap();
            let sid = match sid {
                Some(id) => id,
                None => {
                    tracing::warn!("[aggregator] no active session — skipping");
                    continue;
                }
            };

            let events = ring.lock().unwrap().drain_all();
            let sys = {
                let mut guard = system.write().unwrap();
                let snap = guard.clone();
                guard.app_switch_count = 0;
                snap
            };

            tracing::info!(
                "[aggregator] firing — session={} events={} cpu={:.1} ram={:.1}",
                sid, events.len(), sys.cpu_percent, sys.ram_percent
            );

            let snap = compute_snapshot(&events, &sys, sid, window_end_ms, AGGREGATION_SECS as f64);

            match crate::storage::queries::insert_snapshot(pools.write.as_ref(), &snap).await {
                Ok(_) => {}
                Err(e) => {
                    tracing::error!("[aggregator] insert failed: {e}");
                    continue;
                }
            }

            summary_acc.lock().unwrap().record_snapshot(snap.clone());

            // ── Classify ──────────────────────────────────────────────────────
            let first_ms = get_first_session_ms(pools.read.as_ref()).await.ok().flatten();
            let cold_start = is_cold_start(first_ms);

            let (hour, dow) = local_time_parts();
            let tod_bucket = time_of_day_bucket(hour);
            let baselines = baseline::load_baselines(
                pools.read.as_ref(), tod_bucket, dow as i32,
            ).await.unwrap_or_default();

            let z = compute_z_scores(&snap, AGGREGATION_SECS as f64, &baselines);

            if let Some(state) = state_machine.lock().unwrap().update(&z, window_end_ms) {
                tracing::info!("[classifier] state committed: {:?}", state);
                summary_acc.lock().unwrap().on_state_change(state, window_end_ms);
                let _ = app_handle.emit("state_changed", StateChangedPayload {
                    state: state.as_str().to_string(),
                    cold_start,
                });
            }

            anomaly_detector.lock().unwrap().check(&z, window_end_ms, cold_start);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pipeline::ring_buffer::MouseButton;

    fn sys() -> SystemSnapshot {
        SystemSnapshot::default()
    }

    #[test]
    fn typing_speed_computed_correctly() {
        let events: Vec<RawInputEvent> = (0..30)
            .map(|i| RawInputEvent::KeyDown { ts_ms: i * 2000, is_deletion: false })
            .collect();
        let snap = compute_snapshot(&events, &sys(), 1, 60_000, 60.0);
        assert!((snap.typing_speed - 0.5).abs() < 0.01);
    }

    #[test]
    fn error_rate_computed_correctly() {
        let events = vec![
            RawInputEvent::KeyDown { ts_ms: 100, is_deletion: false },
            RawInputEvent::KeyDown { ts_ms: 200, is_deletion: true },
            RawInputEvent::KeyDown { ts_ms: 300, is_deletion: true },
            RawInputEvent::KeyDown { ts_ms: 400, is_deletion: false },
        ];
        let snap = compute_snapshot(&events, &sys(), 1, 60_000, 60.0);
        assert!((snap.error_rate - 0.5).abs() < 0.01);
    }

    #[test]
    fn pause_count_detects_gaps() {
        let events = vec![
            RawInputEvent::KeyDown { ts_ms: 1000, is_deletion: false },
            RawInputEvent::KeyDown { ts_ms: 4000, is_deletion: false },
            RawInputEvent::KeyDown { ts_ms: 4500, is_deletion: false },
        ];
        let snap = compute_snapshot(&events, &sys(), 1, 60_000, 60.0);
        assert_eq!(snap.pause_count, 1);
    }

    #[test]
    fn click_and_scroll_counted() {
        let events = vec![
            RawInputEvent::MouseClick { button: MouseButton::Left, ts_ms: 100 },
            RawInputEvent::MouseClick { button: MouseButton::Right, ts_ms: 200 },
            RawInputEvent::Scroll { delta_x: 0, delta_y: -3, ts_ms: 300 },
        ];
        let snap = compute_snapshot(&events, &sys(), 1, 60_000, 60.0);
        assert_eq!(snap.click_count, 2);
        assert_eq!(snap.scroll_count, 1);
    }

    #[test]
    fn empty_events_returns_zero_snapshot() {
        let snap = compute_snapshot(&[], &sys(), 1, 60_000, 60.0);
        assert_eq!(snap.typing_speed, 0.0);
        assert_eq!(snap.error_rate, 0.0);
        assert_eq!(snap.pause_count, 0);
        assert_eq!(snap.mouse_speed, 0.0);
    }

    #[test]
    fn system_signals_mirrored_correctly() {
        let mut s = sys();
        s.cpu_percent = 42.5;
        s.ram_percent = 77.3;
        s.battery_percent = 80;
        s.on_battery = true;
        s.window_count = 12;
        s.foreground_app = "code.exe".to_string();
        s.app_switch_count = 3;
        s.single_window_hold_ms = 5000;
        let snap = compute_snapshot(&[], &s, 99, 60_000, 60.0);
        assert!((snap.cpu_percent - 42.5).abs() < 0.01);
        assert_eq!(snap.battery_percent, 80);
        assert!(snap.on_battery);
        assert_eq!(snap.window_count, 12);
        assert_eq!(snap.foreground_app, "code.exe");
        assert_eq!(snap.app_switch_count, 3);
        assert_eq!(snap.single_window_hold_ms, 5000);
    }
}
