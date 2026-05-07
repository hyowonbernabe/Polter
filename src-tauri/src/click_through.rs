use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Manager, Runtime};

#[derive(Debug, Clone, Copy, Default)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub fn point_in_rect(px: f64, py: f64, r: &Rect) -> bool {
    px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height
}

/// Polls cursor position at ~60fps and toggles click-through on the main window.
/// Also detects fullscreen exclusive windows and emits `polter://fullscreen-detected`
/// once per transition (rising edge only, not every frame).
pub fn start<R: Runtime>(
    app: AppHandle<R>,
    creature_bounds: Arc<Mutex<Rect>>,
    bubble_bounds: Arc<Mutex<Option<Rect>>>,
    drag_active: Arc<AtomicBool>,
) {
    std::thread::spawn(move || {
        loop {
            let inside = if drag_active.load(Ordering::Relaxed) {
                true
            } else {
                let (cx, cy) = cursor_pos_screen();
                let cb = creature_bounds.lock().unwrap();
                let bb = bubble_bounds.lock().unwrap();
                point_in_rect(cx, cy, &*cb)
                    || bb.as_ref().map_or(false, |r| point_in_rect(cx, cy, r))
            };

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_ignore_cursor_events(!inside);
            }

            // Fullscreen flee disabled — caused teleport glitches.
            // let now_fullscreen = is_fullscreen_exclusive();
            // if now_fullscreen && !was_fullscreen {
            //     let _ = app.emit("polter://fullscreen-detected", ());
            // }
            // was_fullscreen = now_fullscreen;

            std::thread::sleep(Duration::from_millis(16));
        }
    });
}

/// Returns true if there is a non-Polter popup window covering an entire monitor completely.
/// This is the signature of fullscreen exclusive mode used by games and media players.
#[cfg(target_os = "windows")]
#[allow(dead_code)]
fn is_fullscreen_exclusive() -> bool {
    use windows::Win32::Foundation::RECT;
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
    use windows::Win32::System::Threading::GetCurrentProcessId;
    use windows::Win32::UI::WindowsAndMessaging::{
        GWL_STYLE, WS_CAPTION, WS_POPUP,
        GetForegroundWindow, GetWindowLongW, GetWindowRect, GetWindowThreadProcessId,
    };

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return false;
        }

        // Exclude our own process so Polter never triggers its own flee
        let mut win_pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut win_pid));
        if win_pid == GetCurrentProcessId() {
            return false;
        }

        // Must be a borderless popup (no title bar) — typical for fullscreen games
        let style = GetWindowLongW(hwnd, GWL_STYLE) as u32;
        if (style & WS_POPUP.0) == 0 || (style & WS_CAPTION.0) != 0 {
            return false;
        }

        // Get window bounds and compare against full monitor rect (includes taskbar)
        let mut win_rect = RECT::default();
        let _ = GetWindowRect(hwnd, &mut win_rect);
        // If rect is all zeros the call failed — no match possible
        if win_rect.right == 0 && win_rect.bottom == 0 {
            return false;
        }

        let hmonitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !GetMonitorInfoW(hmonitor, &mut info).as_bool() {
            return false;
        }

        let mr = info.rcMonitor;
        win_rect.left == mr.left
            && win_rect.top == mr.top
            && win_rect.right == mr.right
            && win_rect.bottom == mr.bottom
    }
}

#[cfg(not(target_os = "windows"))]
#[allow(dead_code)]
fn is_fullscreen_exclusive() -> bool {
    false
}

#[cfg(target_os = "windows")]
fn cursor_pos_screen() -> (f64, f64) {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut pt = POINT::default();
    unsafe { let _ = GetCursorPos(&mut pt); }
    (pt.x as f64, pt.y as f64)
}

#[cfg(not(target_os = "windows"))]
fn cursor_pos_screen() -> (f64, f64) {
    (0.0, 0.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn r(x: f64, y: f64, w: f64, h: f64) -> Rect {
        Rect { x, y, width: w, height: h }
    }

    #[test]
    fn cursor_inside_rect() {
        assert!(point_in_rect(50.0, 50.0, &r(0.0, 0.0, 100.0, 100.0)));
    }

    #[test]
    fn cursor_on_edge_is_inside() {
        assert!(point_in_rect(0.0, 0.0, &r(0.0, 0.0, 100.0, 100.0)));
        assert!(point_in_rect(100.0, 100.0, &r(0.0, 0.0, 100.0, 100.0)));
    }

    #[test]
    fn cursor_outside_rect() {
        assert!(!point_in_rect(150.0, 50.0, &r(0.0, 0.0, 100.0, 100.0)));
        assert!(!point_in_rect(50.0, -1.0, &r(0.0, 0.0, 100.0, 100.0)));
    }
}
