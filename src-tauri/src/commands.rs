use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
pub type TrayDotState = Arc<Mutex<bool>>;
pub type DragActiveState = Arc<AtomicBool>;
pub type BubbleBoundsState = Arc<Mutex<Option<crate::click_through::Rect>>>;
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
pub fn set_drag_active(active: bool, drag_active: tauri::State<'_, DragActiveState>) {
    drag_active.store(active, Ordering::Relaxed);
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
pub fn set_bubble_bounds(
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    bounds: tauri::State<'_, BubbleBoundsState>,
    app_handle: tauri::AppHandle,
) {
    let (scale, win_x, win_y) = app_handle
        .get_webview_window("main")
        .map(|w| {
            let scale = w.scale_factor().unwrap_or(1.0);
            let pos = w.outer_position().unwrap_or(tauri::PhysicalPosition::new(0, 0));
            (scale, pos.x as f64, pos.y as f64)
        })
        .unwrap_or((1.0, 0.0, 0.0));
    *bounds.lock().unwrap() = Some(crate::click_through::Rect {
        x: win_x + x * scale,
        y: win_y + y * scale,
        width: width * scale,
        height: height * scale,
    });
}

#[tauri::command]
pub fn clear_bubble_bounds(bounds: tauri::State<'_, BubbleBoundsState>) {
    *bounds.lock().unwrap() = None;
}

#[tauri::command]
pub fn set_api_key(key: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    settings::set_api_key(&app_handle, &key)?;
    let _ = app_handle.emit("inference_mode_changed", "cloud");
    Ok(())
}

#[tauri::command]
pub fn get_api_key(app_handle: tauri::AppHandle) -> Option<String> {
    settings::get_api_key(&app_handle)
}

#[tauri::command]
pub fn clear_api_key(app_handle: tauri::AppHandle) -> Result<(), String> {
    settings::clear_api_key(&app_handle)?;
    let _ = app_handle.emit("inference_mode_changed", "unavailable");
    Ok(())
}

#[tauri::command]
pub fn has_api_key(app_handle: tauri::AppHandle) -> bool {
    settings::has_api_key(&app_handle)
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SleepScheduleInput {
    pub enabled: bool,
    pub start_hour: u8,
    pub start_minute: u8,
    pub end_hour: u8,
    pub end_minute: u8,
}

impl Default for SleepScheduleInput {
    fn default() -> Self {
        Self { enabled: false, start_hour: 22, start_minute: 0, end_hour: 7, end_minute: 0 }
    }
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
        s.privacy = false; // mutually exclusive with privacy
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
    pools: tauri::State<'_, DbPools>,
    session_id: tauri::State<'_, SessionId>,
    app_handle: tauri::AppHandle,
) -> Result<bool, String> {
    let (new_privacy, was_sleeping) = {
        let mut s = sleep_state.lock().unwrap();
        let was = s.sleeping;
        s.privacy = !s.privacy;
        s.sleeping = false; // mutually exclusive with sleep
        s.schedule_triggered = false;
        (s.privacy, was)
    };
    // If switching from sleep to privacy, start a fresh session.
    if was_sleeping && new_privacy {
        let _ = crate::session::start_new_session(&pools, &session_id).await;
    }
    app_handle
        .emit("sleep_changed", SleepChangedPayload { sleeping: false, privacy: new_privacy })
        .map_err(|e| e.to_string())?;
    Ok(new_privacy)
}

#[tauri::command]
pub fn set_sleep_schedule(
    schedule: SleepScheduleInput,
    sleep_state: tauri::State<'_, SleepState>,
    app_handle: tauri::AppHandle,
) {
    {
        let mut s = sleep_state.lock().unwrap();
        s.schedule_enabled      = schedule.enabled;
        s.schedule_start_hour   = schedule.start_hour;
        s.schedule_start_minute = schedule.start_minute;
        s.schedule_end_hour     = schedule.end_hour;
        s.schedule_end_minute   = schedule.end_minute;
    }
    crate::preferences::save_sleep_schedule(&app_handle, &schedule);
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

// ── Tray dot ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn dismiss_insight(
    tray_dot: tauri::State<'_, TrayDotState>,
    app_handle: tauri::AppHandle,
) {
    *tray_dot.lock().unwrap() = false;
    crate::tray::update_tray(false, None, &app_handle);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub struct DashboardDaySummary {
    pub date: String,
    pub focus_minutes: i64,
    pub deep_minutes: i64,
    pub spark_minutes: i64,
    pub burn_minutes: i64,
    pub calm_minutes: i64,
    pub fade_minutes: i64,
    pub total_active_minutes: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DashboardInsight {
    pub id: i64,
    pub timestamp: i64,
    pub state: String,
    pub insight_text: String,
    pub extended_text: String,
    pub insight_type: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TodayMetrics {
    pub avg_typing_speed: f64,
    pub avg_error_rate: f64,
    pub total_pauses: i64,
    pub avg_mouse_speed: f64,
    pub avg_mouse_jitter: f64,
    pub total_clicks: i64,
    pub total_scrolls: i64,
    pub avg_cpu: f64,
    pub avg_ram: f64,
    pub total_app_switches: i64,
    pub top_app: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DashboardData {
    pub today_active_minutes: i64,
    pub today_longest_focus_minutes: i64,
    pub today_insight_count: i64,
    pub today_session_count: i64,
    pub days: Vec<DashboardDaySummary>,
    pub recent_insights: Vec<DashboardInsight>,
    pub longest_focus_ever_minutes: i64,
    pub best_day_this_week_minutes: i64,
    pub today_metrics: TodayMetrics,
    pub today_hourly: Vec<HourlyPoint>,
}

#[derive(Debug, Clone, Serialize)]
pub struct HourlyPoint {
    pub hour: i32,
    pub avg_typing_speed: f64,
    pub avg_cpu: f64,
    pub snapshot_count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CurrentStateInfo {
    pub state: String,
    pub state_entered_ms: Option<u64>,
}

fn today_start_ms() -> i64 {
    use chrono::{Datelike, Local, TimeZone};
    let now = Local::now();
    Local
        .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
        .single()
        .map(|dt| dt.timestamp_millis())
        .unwrap_or_else(|| now.timestamp_millis())
}

fn today_date_str() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

#[tauri::command]
pub async fn get_dashboard_data(
    pools: tauri::State<'_, DbPools>,
    summary_acc: tauri::State<'_, Arc<Mutex<DailySummaryAccumulator>>>,
) -> Result<DashboardData, String> {
    use crate::storage::queries::{
        get_best_day_this_week_minutes, get_daily_insight_count, get_daily_summary,
        get_last_7_daily_summaries, get_longest_focus_block_ms, get_recent_insights,
        get_today_hourly, get_today_metrics, get_today_session_count,
    };
    let today_str = today_date_str();
    let today_ms = today_start_ms();

    let today = get_daily_summary(pools.read.as_ref(), &today_str)
        .await
        .map_err(|e| e.to_string())?;
    let today_longest_focus_minutes = today.as_ref().map(|r| r.longest_focus_block_minutes).unwrap_or(0);
    let today_insight_count = get_daily_insight_count(pools.read.as_ref(), today_ms)
        .await
        .map_err(|e| e.to_string())?;

    let m = get_today_metrics(pools.read.as_ref(), today_ms)
        .await
        .map_err(|e| e.to_string())?;

    let today_active_minutes    = m.snapshot_count;
    let today_session_count     = get_today_session_count(pools.read.as_ref(), today_ms)
        .await
        .map_err(|e| e.to_string())?;

    let mut days: Vec<DashboardDaySummary> = get_last_7_daily_summaries(pools.read.as_ref())
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|r| DashboardDaySummary {
            date: r.date,
            focus_minutes: r.focus_minutes,
            deep_minutes: r.deep_minutes,
            spark_minutes: r.spark_minutes,
            burn_minutes: r.burn_minutes,
            calm_minutes: r.calm_minutes,
            fade_minutes: r.fade_minutes,
            total_active_minutes: r.total_active_minutes,
        })
        .collect();

    let recent_insights = get_recent_insights(pools.read.as_ref(), 20)
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|r| DashboardInsight {
            id: r.id,
            timestamp: r.timestamp,
            state: r.state,
            insight_text: r.insight_text,
            extended_text: r.extended_text,
            insight_type: r.insight_type,
        })
        .collect();

    // Inject live today data from the in-memory accumulator into the days array.
    // daily_summaries is only written on session END, so an ongoing session would be absent.
    {
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let (_, live_focus, live_calm, live_deep, live_spark, live_burn, live_fade, _, _) = {
            summary_acc.lock().unwrap().peek_params(now_ms)
        };

        let today_pos = days.iter().position(|d| d.date == today_str);
        if let Some(i) = today_pos {
            // Session already ended once today and wrote a DB row — add current session on top.
            days[i].focus_minutes += live_focus;
            days[i].calm_minutes  += live_calm;
            days[i].deep_minutes  += live_deep;
            days[i].spark_minutes += live_spark;
            days[i].burn_minutes  += live_burn;
            days[i].fade_minutes  += live_fade;
            days[i].total_active_minutes = today_active_minutes;
        } else {
            // First session of the day hasn't ended yet — synthesize today's row.
            days.push(DashboardDaySummary {
                date:                 today_str.clone(),
                focus_minutes:        live_focus,
                calm_minutes:         live_calm,
                deep_minutes:         live_deep,
                spark_minutes:        live_spark,
                burn_minutes:         live_burn,
                fade_minutes:         live_fade,
                total_active_minutes: today_active_minutes,
            });
            days.sort_by(|a, b| b.date.cmp(&a.date));
            days.truncate(7);
        }
    }

    let longest_focus_ever_minutes = get_longest_focus_block_ms(pools.read.as_ref())
        .await
        .map_err(|e| e.to_string())?
        / 60_000;

    let best_day_this_week_minutes = get_best_day_this_week_minutes(pools.read.as_ref())
        .await
        .map_err(|e| e.to_string())?;
    let best_day_this_week_minutes = best_day_this_week_minutes.max(today_active_minutes);

    let today_metrics = TodayMetrics {
        avg_typing_speed:   m.avg_typing_speed,
        avg_error_rate:     m.avg_error_rate,
        total_pauses:       m.total_pauses,
        avg_mouse_speed:    m.avg_mouse_speed,
        avg_mouse_jitter:   m.avg_mouse_jitter,
        total_clicks:       m.total_clicks,
        total_scrolls:      m.total_scrolls,
        avg_cpu:            m.avg_cpu,
        avg_ram:            m.avg_ram,
        total_app_switches: m.total_app_switches,
        top_app:            m.top_app,
    };

    let hourly_raw = get_today_hourly(pools.read.as_ref(), today_ms)
        .await
        .map_err(|e| e.to_string())?;
    let today_hourly = hourly_raw.into_iter().map(|h| HourlyPoint {
        hour:             h.hour,
        avg_typing_speed: h.avg_typing_speed,
        avg_cpu:          h.avg_cpu,
        snapshot_count:   h.snapshot_count,
    }).collect();

    Ok(DashboardData {
        today_active_minutes,
        today_longest_focus_minutes,
        today_insight_count,
        today_session_count,
        days,
        recent_insights,
        longest_focus_ever_minutes,
        best_day_this_week_minutes,
        today_metrics,
        today_hourly,
    })
}

#[tauri::command]
pub fn get_current_state_info(
    state_machine: tauri::State<'_, Arc<Mutex<StateMachine>>>,
) -> CurrentStateInfo {
    let sm = state_machine.lock().unwrap();
    CurrentStateInfo {
        state: sm.current_state.as_str().to_string(),
        state_entered_ms: sm.state_entered_ms,
    }
}

pub fn do_open_dashboard(app: &tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    unsafe {
        use windows::Win32::Foundation::POINT;
        use windows::Win32::Graphics::Gdi::{
            GetMonitorInfoW, MonitorFromPoint, MONITOR_DEFAULTTOPRIMARY, MONITORINFO,
        };
        let scale = app
            .get_webview_window("main")
            .map(|w| w.scale_factor().unwrap_or(1.0))
            .unwrap_or(1.0);
        let hmon = MonitorFromPoint(POINT { x: 0, y: 0 }, MONITOR_DEFAULTTOPRIMARY);
        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        let _ = GetMonitorInfoW(hmon, &mut info);
        let logical_x = ((info.rcWork.right as f64 - 420.0 - 20.0) / scale) as i32;
        let logical_y = ((info.rcWork.bottom as f64 - 680.0 - 20.0) / scale) as i32;
        if let Some(dash) = app.get_webview_window("dashboard") {
            dash.set_position(tauri::LogicalPosition::new(logical_x as f64, logical_y as f64))
                .map_err(|e| e.to_string())?;
            dash.show().map_err(|e| e.to_string())?;
            dash.set_focus().map_err(|e| e.to_string())?;
        }
    }
    #[cfg(not(target_os = "windows"))]
    if let Some(dash) = app.get_webview_window("dashboard") {
        dash.show().map_err(|e| e.to_string())?;
        dash.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_dashboard(app_handle: tauri::AppHandle) -> Result<(), String> {
    do_open_dashboard(&app_handle)
}

#[tauri::command]
pub fn close_dashboard(app_handle: tauri::AppHandle) {
    if let Some(dash) = app_handle.get_webview_window("dashboard") {
        let _ = dash.hide();
    }
}

#[tauri::command]
pub fn toggle_dashboard(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(dash) = app_handle.get_webview_window("dashboard") {
        if dash.is_visible().unwrap_or(false) {
            let _ = dash.hide();
            return Ok(());
        }
    }
    do_open_dashboard(&app_handle)
}

#[tauri::command]
pub fn quit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

// ── Settings window ───────────────────────────────────────────────────────────

pub fn do_open_settings(app: &tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    unsafe {
        use windows::Win32::Foundation::POINT;
        use windows::Win32::Graphics::Gdi::{
            GetMonitorInfoW, MonitorFromPoint, MONITOR_DEFAULTTOPRIMARY, MONITORINFO,
        };
        let scale = app
            .get_webview_window("main")
            .map(|w| w.scale_factor().unwrap_or(1.0))
            .unwrap_or(1.0);
        let hmon = MonitorFromPoint(POINT { x: 0, y: 0 }, MONITOR_DEFAULTTOPRIMARY);
        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        let _ = GetMonitorInfoW(hmon, &mut info);
        let logical_x = ((info.rcWork.right as f64 - 420.0 - 20.0) / scale) as i32;
        let logical_y = ((info.rcWork.bottom as f64 - 680.0 - 20.0) / scale) as i32;
        if let Some(win) = app.get_webview_window("settings") {
            win.set_position(tauri::LogicalPosition::new(logical_x as f64, logical_y as f64))
                .map_err(|e| e.to_string())?;
            win.show().map_err(|e| e.to_string())?;
            win.set_focus().map_err(|e| e.to_string())?;
        }
    }
    #[cfg(not(target_os = "windows"))]
    if let Some(win) = app.get_webview_window("settings") {
        win.show().map_err(|e| e.to_string())?;
        win.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn open_settings(app_handle: tauri::AppHandle) -> Result<(), String> {
    do_open_settings(&app_handle)
}

#[tauri::command]
pub fn close_settings(app_handle: tauri::AppHandle) {
    if let Some(win) = app_handle.get_webview_window("settings") {
        let _ = win.hide();
    }
}

// ── Data operations ───────────────────────────────────────────────────────────

#[tauri::command]
pub async fn clear_snapshots(pools: tauri::State<'_, DbPools>) -> Result<u64, String> {
    let result = sqlx::query("DELETE FROM behavioral_snapshots")
        .execute(pools.write.as_ref())
        .await
        .map_err(|e| e.to_string())?;
    Ok(result.rows_affected())
}

#[tauri::command]
pub async fn export_insights(pools: tauri::State<'_, DbPools>) -> Result<String, String> {
    use sqlx::Row;
    let rows = sqlx::query(
        "SELECT timestamp, state, insight_text, extended_text FROM insights ORDER BY timestamp ASC",
    )
    .fetch_all(pools.read.as_ref())
    .await
    .map_err(|e| e.to_string())?;

    if rows.is_empty() {
        return Ok(String::from("No insights recorded yet.\n"));
    }

    let mut out = String::new();
    for row in rows {
        let ts_ms: i64 = row.get(0);
        let state: String = row.get(1);
        let text: String = row.get(2);
        let extended: String = row.get(3);
        let ts = chrono::DateTime::from_timestamp_millis(ts_ms)
            .map(|dt| {
                dt.with_timezone(&chrono::Local)
                    .format("%Y-%m-%d %H:%M")
                    .to_string()
            })
            .unwrap_or_else(|| "unknown".to_string());
        out.push_str(&format!("[{ts}] {state}\n{text}\n\n{extended}\n\n---\n\n"));
    }
    Ok(out)
}

// ── Onboarding ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tier2Choices {
    pub screen: bool,
    pub clipboard: bool,
    pub calendar: bool,
    pub inference_provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tier2Permissions {
    pub screen: bool,
    pub clipboard: bool,
    pub calendar: bool,
}

impl Default for Tier2Permissions {
    fn default() -> Self {
        Self {
            screen: false,
            clipboard: false,
            calendar: false,
        }
    }
}

fn load_tier2_permissions(app_handle: &tauri::AppHandle) -> Tier2Permissions {
    use tauri_plugin_store::StoreExt;

    let store = match app_handle.store("wisp-settings.json") {
        Ok(s) => s,
        Err(_) => return Tier2Permissions::default(),
    };

    let parsed = store
        .get("tier2_choices")
        .and_then(|v| serde_json::from_value::<Tier2Choices>(v).ok())
        .map(|c| Tier2Permissions {
            screen: c.screen,
            clipboard: c.clipboard,
            calendar: c.calendar,
        });

    if let Some(p) = parsed {
        return p;
    }

    // Migration fallback for earlier temporary key shape.
    store
        .get("tier2_permissions")
        .and_then(|v| serde_json::from_value::<Tier2Permissions>(v).ok())
        .unwrap_or_default()
}

fn save_tier2_permissions(
    app_handle: &tauri::AppHandle,
    perms: &Tier2Permissions,
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    let store = app_handle.store("wisp-settings.json").map_err(|e| e.to_string())?;

    let provider = store
        .get("inference_provider")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_else(|| "skipped".to_string());

    let merged = Tier2Choices {
        screen: perms.screen,
        clipboard: perms.clipboard,
        calendar: perms.calendar,
        inference_provider: provider,
    };

    store.set(
        "tier2_choices",
        serde_json::to_value(&merged).unwrap_or(serde_json::Value::Null),
    );

    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

/// Synchronous helper for backend sensor gating.
/// Call this from the aggregator or inference engine before using optional
/// signals (screen, clipboard, calendar). Not yet wired — signals are unimplemented.
#[allow(dead_code)]
pub fn get_tier2_permissions_sync(app_handle: &tauri::AppHandle) -> Tier2Permissions {
    load_tier2_permissions(app_handle)
}

#[tauri::command]
pub fn get_tier2_permissions(app_handle: tauri::AppHandle) -> Tier2Permissions {
    load_tier2_permissions(&app_handle)
}

#[tauri::command]
pub fn set_tier2_permissions(
    permissions: Tier2Permissions,
    app_handle: tauri::AppHandle,
) -> Result<Tier2Permissions, String> {
    save_tier2_permissions(&app_handle, &permissions)?;
    let _ = app_handle.emit("tier2_permissions_changed", permissions.clone());
    Ok(permissions)
}

#[tauri::command]
pub fn is_onboarding_complete(app_handle: tauri::AppHandle) -> bool {
    use tauri_plugin_store::StoreExt;
    app_handle
        .store("wisp-settings.json")
        .ok()
        .and_then(|s| s.get("onboarding_complete"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
}

#[tauri::command]
pub fn complete_onboarding(
    choices: Tier2Choices,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;
    let store = app_handle.store("wisp-settings.json").map_err(|e| e.to_string())?;
    store.set("onboarding_complete", serde_json::Value::Bool(true));
    store.set(
        "tier2_choices",
        serde_json::to_value(&choices).unwrap_or(serde_json::Value::Null),
    );
    store.set(
        "inference_provider",
        serde_json::Value::String(choices.inference_provider.clone()),
    );
    let _ = store.save();

    // Hide onboarding, show main window.
    if let Some(ob) = app_handle.get_webview_window("onboarding") {
        let _ = ob.hide();
    }
    if let Some(main) = app_handle.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }

    // Emit wake animation, then after 3 s fire the first-ever insight bubble.
    let _ = app_handle.emit("wake_animation", ());
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
        let _ = handle.emit(
            "insight_ready",
            crate::inference::trigger::InsightReadyPayload {
                tier: "insight".to_string(),
                state: "rest".to_string(),
                insight: "give me a few days. i'll tell you something when i know something.".to_string(),
                extended: "Wisp is quietly learning your patterns. Check back soon.".to_string(),
                insight_type: "flow_detection".to_string(),
                is_first_ever: true,
            },
        );
    });

    Ok(())
}

#[tauri::command]
pub fn open_onboarding(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(ob) = app_handle.get_webview_window("onboarding") {
        ob.center().map_err(|e| e.to_string())?;
        ob.show().map_err(|e| e.to_string())?;
        ob.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn dismiss_onboarding(app_handle: tauri::AppHandle) {
    if let Some(ob) = app_handle.get_webview_window("onboarding") {
        let _ = ob.hide();
    }
    if let Some(main) = app_handle.get_webview_window("main") {
        let _ = main.show();
    }
    let _ = app_handle.emit("wake_animation", ());
}

#[tauri::command]
pub fn reset_onboarding(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;
    let store = app_handle.store("wisp-settings.json").map_err(|e| e.to_string())?;
    store.set("onboarding_complete", serde_json::Value::Bool(false));
    let _ = store.save();

    // Hide main window, show onboarding centered.
    if let Some(main) = app_handle.get_webview_window("main") {
        let _ = main.hide();
    }
    if let Some(ob) = app_handle.get_webview_window("onboarding") {
        ob.center().map_err(|e| e.to_string())?;
        ob.show().map_err(|e| e.to_string())?;
        ob.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize)]
pub struct BufferStats {
    pub keys: usize,
    pub clicks: usize,
    pub scrolls: usize,
    pub moves: usize,
    pub last_event_ms: Option<u64>,
}

#[tauri::command]
pub fn get_buffer_stats(
    ring: tauri::State<'_, Arc<Mutex<crate::pipeline::ring_buffer::RingBuffer>>>,
) -> BufferStats {
    let guard = ring.lock().unwrap();
    let counts = guard.pending_counts();
    BufferStats {
        keys: counts.keys,
        clicks: counts.clicks,
        scrolls: counts.scrolls,
        moves: counts.moves,
        last_event_ms: guard.last_event_ts(),
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct LiveStatus {
    pub session_id: Option<i64>,
    pub snapshots_today: i64,
    pub last_snapshot_ms: Option<i64>,
    pub input_monitor_alive: bool,
    pub current_longest_focus_mins: i64,
    pub inference_active_secs: u64,
    pub inference_last_error: Option<String>,
    pub api_key_present: bool,
}

#[tauri::command]
pub async fn get_live_status(
    pools: tauri::State<'_, DbPools>,
    session_id: tauri::State<'_, SessionId>,
    ring: tauri::State<'_, Arc<Mutex<crate::pipeline::ring_buffer::RingBuffer>>>,
    summary_acc: tauri::State<'_, Arc<Mutex<crate::classifier::daily_summary::DailySummaryAccumulator>>>,
    inference_engine: tauri::State<'_, Arc<Mutex<crate::inference::InferenceEngine>>>,
    app_handle: tauri::AppHandle,
) -> Result<LiveStatus, String> {
    let (inference_active_secs, inference_last_error) = {
        let eng = inference_engine.lock().unwrap();
        (eng.session_active_secs, eng.last_error.clone())
    };

    let sid = *session_id.lock().unwrap();
    let today_ms = today_start_ms();

    let snapshots_today: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM behavioral_snapshots WHERE timestamp >= ?",
    )
    .bind(today_ms)
    .fetch_one(pools.read.as_ref())
    .await
    .map_err(|e| e.to_string())?;

    let last_snap: Option<(i64,)> = sqlx::query_as(
        "SELECT timestamp FROM behavioral_snapshots ORDER BY timestamp DESC LIMIT 1",
    )
    .fetch_optional(pools.read.as_ref())
    .await
    .map_err(|e| e.to_string())?;

    let last_event_ms = ring.lock().unwrap().last_event_ts();
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let input_monitor_alive = last_event_ms.map_or(false, |ts| now_ms.saturating_sub(ts) < 30_000);

    let current_longest_focus_mins = {
        let acc = summary_acc.lock().unwrap();
        (acc.longest_focus_block_ms / 60_000) as i64
    };

    Ok(LiveStatus {
        session_id: sid,
        snapshots_today: snapshots_today.0,
        last_snapshot_ms: last_snap.map(|r| r.0),
        input_monitor_alive,
        current_longest_focus_mins,
        inference_active_secs,
        inference_last_error,
        api_key_present: settings::has_api_key(&app_handle),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tier2_choices_includes_inference_provider() {
        let c = Tier2Choices {
            screen: true,
            clipboard: false,
            calendar: false,
            inference_provider: "openrouter".to_string(),
        };
        let json = serde_json::to_string(&c).unwrap();
        assert!(json.contains("\"inference_provider\":\"openrouter\""));
    }

    #[test]
    fn tier2_permissions_default_is_all_false() {
        let p = Tier2Permissions::default();
        assert!(!p.screen);
        assert!(!p.clipboard);
        assert!(!p.calendar);
    }

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

    #[test]
    fn dashboard_day_summary_serializes() {
        let d = DashboardDaySummary {
            date: "2026-05-04".into(),
            focus_minutes: 45,
            deep_minutes: 30,
            spark_minutes: 10,
            burn_minutes: 5,
            calm_minutes: 15,
            fade_minutes: 5,
            total_active_minutes: 110,
        };
        let json = serde_json::to_string(&d).unwrap();
        assert!(json.contains("\"date\":\"2026-05-04\""));
        assert!(json.contains("\"focus_minutes\":45"));
        assert!(json.contains("\"total_active_minutes\":110"));
    }

    #[test]
    fn current_state_info_serializes_with_entered_ms() {
        let s = CurrentStateInfo {
            state: "spark".into(),
            state_entered_ms: Some(1_714_800_000_000),
        };
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains("\"state\":\"spark\""));
        assert!(json.contains("\"state_entered_ms\":1714800000000"));
    }

    #[test]
    fn current_state_info_serializes_none_entered_ms() {
        let s = CurrentStateInfo {
            state: "rest".into(),
            state_entered_ms: None,
        };
        let json = serde_json::to_string(&s).unwrap();
        assert!(json.contains("\"state_entered_ms\":null"));
    }

    #[test]
    fn today_start_ms_is_before_now() {
        let start = today_start_ms();
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;
        assert!(start <= now_ms);
        // midnight of today is at most 24 hours before now
        assert!(now_ms - start < 86_400_000);
    }
}
