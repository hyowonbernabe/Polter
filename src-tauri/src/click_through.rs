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
/// When the cursor is inside the creature bounds, mouse events are captured.
/// When outside, clicks pass through to whatever is below the overlay.
pub fn start<R: Runtime>(app: AppHandle<R>, bounds: Arc<Mutex<Rect>>) {
    std::thread::spawn(move || loop {
        let (cx, cy) = cursor_pos_screen();
        let inside = {
            let b = bounds.lock().unwrap();
            point_in_rect(cx, cy, &*b)
        };
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.set_ignore_cursor_events(!inside);
        }
        std::thread::sleep(Duration::from_millis(16));
    });
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
