use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
use crate::classifier::{daily_summary::DailySummaryAccumulator, state_machine::StateMachine};
use crate::click_through::Rect;
use crate::session::SessionId;
use crate::settings;
use crate::sleep::SleepState;
use crate::storage::DbPools;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct WorkArea {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct WispReadyPayload {
    pub version: String,
}

pub type BoundsState = Arc<Mutex<Rect>>;

#[tauri::command]
pub fn get_work_area() -> WorkArea {
    #[cfg(target_os = "windows")]
    unsafe {
        use windows::Win32::UI::WindowsAndMessaging::{
            GetSystemMetrics,
            SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN,
            SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN,
        };
        WorkArea {
            x: GetSystemMetrics(SM_XVIRTUALSCREEN),
            y: GetSystemMetrics(SM_YVIRTUALSCREEN),
            width: GetSystemMetrics(SM_CXVIRTUALSCREEN) as u32,
            height: GetSystemMetrics(SM_CYVIRTUALSCREEN) as u32,
        }
    }
    #[cfg(not(target_os = "windows"))]
    WorkArea { x: 0, y: 0, width: 1920, height: 1080 }
}

#[derive(Debug, Serialize)]
pub struct DebugInfo {
    pub session_id: Option<i64>,
    pub snapshot_count: i64,
    pub last_typing_speed: f64,
    pub last_mouse_speed: f64,
    pub last_click_count: i32,
    pub last_cpu_percent: f32,
    pub last_ram_percent: f32,
    pub last_window_count: i32,
    pub last_snapshot_age_secs: Option<i64>,
    pub current_state: String,
    pub cold_start: bool,
    pub days_since_first_session: Option<i64>,
}

#[tauri::command]
pub async fn get_debug_info(
    pools: tauri::State<'_, DbPools>,
    session_id: tauri::State<'_, SessionId>,
    state_machine: tauri::State<'_, Arc<Mutex<StateMachine>>>,
) -> Result<DebugInfo, String> {
    let sid = *session_id.lock().unwrap();
    let (current_state, cold_start, days_since_first_session) = {
        let first_ms = crate::storage::queries::get_first_session_ms(pools.read.as_ref())
            .await
            .map_err(|e| e.to_string())?;
        let cold = crate::classifier::is_cold_start(first_ms);
        let days = first_ms.map(|ms| {
            let now_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64;
            (now_ms - ms) / (86_400 * 1_000)
        });
        let state = state_machine.lock().unwrap().current_state.as_str().to_string();
        (state, cold, days)
    };

    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM behavioral_snapshots")
        .fetch_one(pools.read.as_ref())
        .await
        .map_err(|e| e.to_string())?;

    let latest = sqlx::query(
        "SELECT typing_speed, mouse_speed, click_count, cpu_percent, ram_percent, window_count, timestamp
         FROM behavioral_snapshots ORDER BY timestamp DESC LIMIT 1",
    )
    .fetch_optional(pools.read.as_ref())
    .await
    .map_err(|e| e.to_string())?;

    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;

    let (last_typing_speed, last_mouse_speed, last_click_count, last_cpu_percent,
         last_ram_percent, last_window_count, last_snapshot_age_secs) = match latest {
        Some(row) => {
            use sqlx::Row;
            let ts: i64 = row.get(6);
            let age = (now_ms - ts) / 1000;
            (row.get::<f64, _>(0), row.get::<f64, _>(1), row.get::<i64, _>(2) as i32,
             row.get::<f64, _>(3) as f32, row.get::<f64, _>(4) as f32,
             row.get::<i64, _>(5) as i32, Some(age))
        }
        None => (0.0, 0.0, 0, 0.0, 0.0, 0, None),
    };

    Ok(DebugInfo {
        session_id: sid,
        snapshot_count: count.0,
        last_typing_speed,
        last_mouse_speed,
        last_click_count,
        last_cpu_percent,
        last_ram_percent,
        last_window_count,
        last_snapshot_age_secs,
        current_state,
        cold_start,
        days_since_first_session,
    })
}

#[tauri::command]
pub fn set_creature_bounds(
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    bounds: tauri::State<'_, BoundsState>,
    app_handle: tauri::AppHandle,
) {
    // CSS coordinates are logical pixels relative to the window's client origin.
    // GetCursorPos returns physical screen coordinates. Convert here so the
    // click-through loop can compare apples to apples.
    let (scale, win_x, win_y) = app_handle
        .get_webview_window("main")
        .map(|w| {
            let scale = w.scale_factor().unwrap_or(1.0);
            let pos = w.outer_position().unwrap_or(tauri::PhysicalPosition::new(0, 0));
            (scale, pos.x as f64, pos.y as f64)
        })
        .unwrap_or((1.0, 0.0, 0.0));
    let mut b = bounds.lock().unwrap();
    b.x = win_x + x * scale;
    b.y = win_y + y * scale;
    b.width = width * scale;
    b.height = height * scale;
}

#[tauri::command]
pub fn set_api_key(key: String) -> Result<(), String> {
    settings::set_api_key(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_api_key() -> Option<String> {
    settings::get_api_key()
}

#[tauri::command]
pub fn clear_api_key() -> Result<(), String> {
    settings::clear_api_key().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn has_api_key() -> bool {
    settings::has_api_key()
}

#[derive(Debug, Clone, Serialize)]
pub struct MonitorInfo {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub fn get_monitors(app_handle: tauri::AppHandle) -> Vec<MonitorInfo> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::{BOOL, LPARAM, RECT};
        use windows::Win32::Graphics::Gdi::{
            EnumDisplayMonitors, GetMonitorInfoW, HDC, HMONITOR, MONITORINFO,
        };

        let (scale, win_x, win_y) = app_handle
            .get_webview_window("main")
            .map(|w| {
                let scale = w.scale_factor().unwrap_or(1.0);
                let pos = w.outer_position().unwrap_or(tauri::PhysicalPosition::new(0, 0));
                (scale, pos.x as f64, pos.y as f64)
            })
            .unwrap_or((1.0, 0.0, 0.0));

        let mut rects: Vec<RECT> = Vec::new();

        unsafe extern "system" fn monitor_cb(
            hmon: HMONITOR,
            _hdc: HDC,
            _rect: *mut RECT,
            data: LPARAM,
        ) -> BOOL {
            let list = &mut *(data.0 as *mut Vec<RECT>);
            let mut info = MONITORINFO {
                cbSize: std::mem::size_of::<MONITORINFO>() as u32,
                ..Default::default()
            };
            if GetMonitorInfoW(hmon, &mut info).as_bool() {
                list.push(info.rcWork);
            }
            BOOL(1)
        }

        unsafe {
            let _ = EnumDisplayMonitors(
                HDC(std::ptr::null_mut()),
                None,
                Some(monitor_cb),
                LPARAM(&mut rects as *mut _ as isize),
            );
        }

        rects
            .iter()
            .map(|r| MonitorInfo {
                x: ((r.left as f64 - win_x) / scale) as i32,
                y: ((r.top as f64 - win_y) / scale) as i32,
                width: ((r.right - r.left) as f64 / scale) as u32,
                height: ((r.bottom - r.top) as f64 / scale) as u32,
            })
            .collect()
    }
    #[cfg(not(target_os = "windows"))]
    vec![MonitorInfo { x: 0, y: 0, width: 1920, height: 1080 }]
}

// ── Sleep / Privacy ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct SleepChangedPayload {
    pub sleeping: bool,
    pub privacy: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct SleepStatus {
    pub sleeping: bool,
    pub privacy: bool,
    pub schedule_enabled: bool,
    pub schedule_start_hour: u8,
    pub schedule_start_minute: u8,
    pub schedule_end_hour: u8,
    pub schedule_end_minute: u8,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SleepScheduleInput {
    pub enabled: bool,
    pub start_hour: u8,
    pub start_minute: u8,
    pub end_hour: u8,
    pub end_minute: u8,
}

#[tauri::command]
pub fn get_sleep_status(sleep_state: tauri::State<'_, SleepState>) -> SleepStatus {
    let s = sleep_state.lock().unwrap();
    SleepStatus {
        sleeping: s.sleeping,
        privacy: s.privacy,
        schedule_enabled: s.schedule_enabled,
        schedule_start_hour: s.schedule_start_hour,
        schedule_start_minute: s.schedule_start_minute,
        schedule_end_hour: s.schedule_end_hour,
        schedule_end_minute: s.schedule_end_minute,
    }
}

#[tauri::command]
pub async fn toggle_sleep(
    sleep_state: tauri::State<'_, SleepState>,
    pools: tauri::State<'_, DbPools>,
    session_id: tauri::State<'_, SessionId>,
    summary_acc: tauri::State<'_, Arc<Mutex<DailySummaryAccumulator>>>,
    app_handle: tauri::AppHandle,
) -> Result<bool, String> {
    let new_sleeping = {
        let mut s = sleep_state.lock().unwrap();
        s.sleeping = !s.sleeping;
        s.schedule_triggered = false;
        s.sleeping
    };
    apply_sleep_change(
        new_sleeping,
        pools.inner().clone(),
        session_id.inner().clone(),
        summary_acc.inner().clone(),
        app_handle,
    ).await
}

#[tauri::command]
pub async fn toggle_privacy(
    sleep_state: tauri::State<'_, SleepState>,
    app_handle: tauri::AppHandle,
) -> Result<bool, String> {
    let new_privacy = {
        let mut s = sleep_state.lock().unwrap();
        s.privacy = !s.privacy;
        s.privacy
    };
    app_handle
        .emit("sleep_changed", SleepChangedPayload { sleeping: false, privacy: new_privacy })
        .map_err(|e| e.to_string())?;
    Ok(new_privacy)
}

#[tauri::command]
pub fn set_sleep_schedule(
    schedule: SleepScheduleInput,
    sleep_state: tauri::State<'_, SleepState>,
) {
    let mut s = sleep_state.lock().unwrap();
    s.schedule_enabled     = schedule.enabled;
    s.schedule_start_hour  = schedule.start_hour;
    s.schedule_start_minute = schedule.start_minute;
    s.schedule_end_hour    = schedule.end_hour;
    s.schedule_end_minute  = schedule.end_minute;
}

/// Shared logic called by both the command and the tray menu event handler.
pub async fn apply_sleep_change(
    new_sleeping: bool,
    pools: DbPools,
    session_id: SessionId,
    summary_acc: Arc<Mutex<DailySummaryAccumulator>>,
    app_handle: tauri::AppHandle,
) -> Result<bool, String> {
    if new_sleeping {
        crate::session::end_current_session(&pools, &session_id, "sleep")
            .await.map_err(|e| e.to_string())?;
        crate::session::finalize_session(&pools, &summary_acc).await;
    } else {
        crate::session::start_new_session(&pools, &session_id)
            .await.map_err(|e| e.to_string())?;
        app_handle.emit("wake_animation", ()).map_err(|e| e.to_string())?;
    }
    app_handle
        .emit("sleep_changed", SleepChangedPayload { sleeping: new_sleeping, privacy: false })
        .map_err(|e| e.to_string())?;
    Ok(new_sleeping)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn work_area_struct_serializes() {
        let wa = WorkArea { x: 0, y: 0, width: 1920, height: 1040 };
        let json = serde_json::to_string(&wa).unwrap();
        assert!(json.contains("\"width\":1920"));
        assert!(json.contains("\"height\":1040"));
    }

    #[test]
    fn wisp_ready_payload_serializes() {
        let p = WispReadyPayload { version: "0.1.0".into() };
        let json = serde_json::to_string(&p).unwrap();
        assert_eq!(json, r#"{"version":"0.1.0"}"#);
    }

    #[test]
    fn debug_info_includes_classifier_fields() {
        let info = DebugInfo {
            session_id: Some(1),
            snapshot_count: 5,
            last_typing_speed: 1.2,
            last_mouse_speed: 300.0,
            last_click_count: 3,
            last_cpu_percent: 20.0,
            last_ram_percent: 50.0,
            last_window_count: 4,
            last_snapshot_age_secs: Some(30),
            current_state: "focus".into(),
            cold_start: true,
            days_since_first_session: Some(7),
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("\"current_state\":\"focus\""));
        assert!(json.contains("\"cold_start\":true"));
        assert!(json.contains("\"days_since_first_session\":7"));
    }

    #[test]
    fn debug_info_none_days_when_no_session() {
        let info = DebugInfo {
            session_id: None,
            snapshot_count: 0,
            last_typing_speed: 0.0,
            last_mouse_speed: 0.0,
            last_click_count: 0,
            last_cpu_percent: 0.0,
            last_ram_percent: 0.0,
            last_window_count: 0,
            last_snapshot_age_secs: None,
            current_state: "rest".into(),
            cold_start: true,
            days_since_first_session: None,
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("\"days_since_first_session\":null"));
        assert!(json.contains("\"session_id\":null"));
    }
}
