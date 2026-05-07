use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use sysinfo::System;
use tauri::{AppHandle, Runtime};
use tokio::sync::Notify;

#[derive(Debug, Clone)]
pub struct SystemSnapshot {
    pub timestamp_ms: u64,
    pub cpu_percent: f32,
    pub ram_percent: f32,
    /// 0–100; -1 = no battery / unknown
    pub battery_percent: i32,
    pub on_battery: bool,
    pub window_count: i32,
    pub foreground_app: String,
    /// Number of foreground-app changes detected since last aggregation drain.
    pub app_switch_count: i32,
    /// How long (ms) the current foreground app has been continuously in focus.
    pub single_window_hold_ms: i64,
    /// 0–100; -1 = unsupported / unable to read
    pub display_brightness: i32,
    /// Whether Windows Night Light (blue light filter) is currently enabled.
    pub night_light_enabled: bool,
}

impl Default for SystemSnapshot {
    fn default() -> Self {
        Self {
            timestamp_ms: 0,
            cpu_percent: 0.0,
            ram_percent: 0.0,
            battery_percent: -1,
            on_battery: false,
            window_count: 0,
            foreground_app: String::new(),
            app_switch_count: 0,
            single_window_hold_ms: 0,
            display_brightness: -1,
            night_light_enabled: false,
        }
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

// ── Windows-only helpers ──────────────────────────────────────────────────────

#[cfg(windows)]
fn battery_info() -> (i32, bool) {
    use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
    let mut status = SYSTEM_POWER_STATUS::default();
    if unsafe { GetSystemPowerStatus(&mut status) }.is_err() {
        return (-1, false);
    }
    let pct = if status.BatteryLifePercent == 255 {
        -1
    } else {
        status.BatteryLifePercent as i32
    };
    let on_battery = status.ACLineStatus == 0;
    (pct, on_battery)
}

#[cfg(not(windows))]
fn battery_info() -> (i32, bool) {
    (-1, false)
}

#[cfg(windows)]
fn window_count() -> i32 {
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, IsWindowVisible};

    let mut count: i32 = 0;
    let count_ptr: *mut i32 = &mut count;

    unsafe extern "system" fn callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let visible = unsafe { IsWindowVisible(hwnd) };
        if visible.as_bool() {
            let counter = lparam.0 as *mut i32;
            unsafe { *counter += 1 };
        }
        BOOL(1)
    }

    unsafe {
        let _ = EnumWindows(Some(callback), LPARAM(count_ptr as isize));
    }
    count
}

#[cfg(not(windows))]
fn window_count() -> i32 {
    0
}

#[cfg(windows)]
fn foreground_app() -> String {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return String::new();
        }
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 {
            return String::new();
        }
        let handle = match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
            Ok(h) => h,
            Err(_) => return String::new(),
        };
        let mut buf = vec![0u16; 260];
        let mut len = buf.len() as u32;
        let _ = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_FORMAT(0),
            windows::core::PWSTR(buf.as_mut_ptr()),
            &mut len,
        );
        let _ = CloseHandle(handle);
        OsString::from_wide(&buf[..len as usize])
            .to_string_lossy()
            .rsplit(['\\', '/'])
            .next()
            .unwrap_or("")
            .to_string()
    }
}

#[cfg(not(windows))]
fn foreground_app() -> String {
    String::new()
}

#[cfg(windows)]
fn display_brightness() -> i32 {
    use windows::Win32::Devices::Display::{
        GetPhysicalMonitorsFromHMONITOR, GetMonitorBrightness, DestroyPhysicalMonitor,
        PHYSICAL_MONITOR,
    };
    use windows::Win32::Graphics::Gdi::MonitorFromWindow;
    use windows::Win32::UI::WindowsAndMessaging::GetDesktopWindow;

    unsafe {
        let hwnd = GetDesktopWindow();
        let hmon = MonitorFromWindow(hwnd, windows::Win32::Graphics::Gdi::MONITOR_DEFAULTTOPRIMARY);
        // First call: get the count by passing a zero-length slice.
        let mut probe = [PHYSICAL_MONITOR::default(); 0];
        if GetPhysicalMonitorsFromHMONITOR(hmon, &mut probe).is_err() {
            return -1;
        }
        // Allocate and fetch one physical monitor (primary).
        let mut monitors = vec![PHYSICAL_MONITOR::default(); 1];
        if GetPhysicalMonitorsFromHMONITOR(hmon, &mut monitors).is_err() {
            return -1;
        }
        let mut min_bright: u32 = 0;
        let mut cur_bright: u32 = 0;
        let mut max_bright: u32 = 0;
        let ok = GetMonitorBrightness(monitors[0].hPhysicalMonitor, &mut min_bright, &mut cur_bright, &mut max_bright);
        let result = if ok == 0 {
            -1
        } else {
            let range = max_bright.saturating_sub(min_bright);
            if range > 0 {
                ((cur_bright.saturating_sub(min_bright) * 100) / range) as i32
            } else {
                cur_bright as i32
            }
        };
        for m in &monitors {
            let _ = DestroyPhysicalMonitor(m.hPhysicalMonitor);
        }
        result
    }
}

#[cfg(not(windows))]
fn display_brightness() -> i32 {
    -1
}

#[cfg(windows)]
fn night_light_enabled() -> bool {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount\Current\default$windows.data.bluelightreduction.bluelightreductionstate";
    let key = match hkcu.open_subkey(path) {
        Ok(k) => k,
        Err(_) => return false,
    };
    let data: Vec<u8> = match key.get_raw_value("Data") {
        Ok(v) => v.bytes,
        Err(_) => return false,
    };
    // Byte at offset 18 (0x12) contains the enable flag.
    // When Night Light is enabled, this byte has bit 0x10 set.
    data.len() > 18 && (data[18] & 0x10) != 0
}

#[cfg(not(windows))]
fn night_light_enabled() -> bool {
    false
}

// ── Poller ────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS: u64 = 30_000;
const SLEEP_DETECT_MULTIPLIER: u64 = 3;

/// `wake_signal` is notified when a sleep/wake gap is detected. Using an internal
/// Notify rather than a Tauri event keeps the noisy gap heuristic off the frontend
/// event bus and prevents spurious UI reactions to VM pauses or debugger stops.
pub fn start<R: Runtime>(
    _app: AppHandle<R>,
    snapshot: Arc<RwLock<SystemSnapshot>>,
    wake_signal: Arc<Notify>,
) {
    tauri::async_runtime::spawn(async move {
        // sysinfo::System is Send — keep one instance alive for accurate CPU deltas.
        let mut sys = System::new_all();
        sys.refresh_cpu_usage();
        tokio::time::sleep(Duration::from_millis(200)).await;
        sys.refresh_cpu_usage();

        let mut last_poll_ms: u64 = now_ms();
        let mut prev_app = String::new();
        let mut last_app_change_ms: u64 = now_ms();

        let mut interval = tokio::time::interval(Duration::from_millis(POLL_INTERVAL_MS));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

        loop {
            interval.tick().await;

            let now = now_ms();
            let gap_ms = now.saturating_sub(last_poll_ms);

            if gap_ms > POLL_INTERVAL_MS * SLEEP_DETECT_MULTIPLIER {
                tracing::info!("[system] sleep/wake detected — gap {}ms", gap_ms);
                wake_signal.notify_one();
            }
            last_poll_ms = now;

            sys.refresh_cpu_usage();
            sys.refresh_memory();
            let cpu = sys.global_cpu_usage();
            let ram_total = sys.total_memory();
            let ram_used = sys.used_memory();
            let ram_pct = if ram_total > 0 {
                (ram_used as f32 / ram_total as f32) * 100.0
            } else {
                0.0
            };

            let (battery_pct, on_bat) = tokio::task::spawn_blocking(battery_info)
                .await
                .unwrap_or((-1, false));
            let wins = tokio::task::spawn_blocking(window_count).await.unwrap_or(0);
            let app_name = tokio::task::spawn_blocking(foreground_app)
                .await
                .unwrap_or_default();
            let brightness = tokio::task::spawn_blocking(display_brightness)
                .await
                .unwrap_or(-1);
            let night_light = tokio::task::spawn_blocking(night_light_enabled)
                .await
                .unwrap_or(false);

            // Track foreground app switches and hold duration.
            if !prev_app.is_empty() && app_name != prev_app {
                last_app_change_ms = now;
                if let Ok(mut guard) = snapshot.write() {
                    guard.app_switch_count += 1;
                }
            }
            let hold_ms = now.saturating_sub(last_app_change_ms) as i64;
            prev_app = app_name.clone();

            if let Ok(mut guard) = snapshot.write() {
                guard.timestamp_ms = now_ms();
                guard.cpu_percent = cpu;
                guard.ram_percent = ram_pct;
                guard.battery_percent = battery_pct;
                guard.on_battery = on_bat;
                guard.window_count = wins;
                guard.foreground_app = app_name;
                guard.single_window_hold_ms = hold_ms;
                guard.display_brightness = brightness;
                guard.night_light_enabled = night_light;
                // app_switch_count is updated above and reset by the aggregator
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn system_snapshot_default_is_valid() {
        let snap = SystemSnapshot::default();
        assert_eq!(snap.battery_percent, -1);
        assert!(!snap.on_battery);
        assert_eq!(snap.window_count, 0);
        assert_eq!(snap.app_switch_count, 0);
        assert_eq!(snap.single_window_hold_ms, 0);
    }

    #[cfg(windows)]
    #[test]
    fn battery_info_returns_valid_range() {
        let (pct, _) = battery_info();
        assert!(pct == -1 || (0..=100).contains(&pct));
    }

    #[cfg(windows)]
    #[test]
    fn window_count_is_non_negative() {
        let count = window_count();
        assert!(count >= 0);
    }
}
