use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use crate::click_through::Rect;
use crate::settings;

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
    {
        use windows::Win32::Foundation::RECT;
        use windows::Win32::UI::WindowsAndMessaging::{
            SystemParametersInfoW, SPI_GETWORKAREA, SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS,
        };
        let mut rect = RECT::default();
        unsafe {
            let _ = SystemParametersInfoW(
                SPI_GETWORKAREA,
                0,
                Some(&mut rect as *mut RECT as *mut _),
                SYSTEM_PARAMETERS_INFO_UPDATE_FLAGS(0),
            );
        }
        WorkArea {
            x: rect.left,
            y: rect.top,
            width: (rect.right - rect.left) as u32,
            height: (rect.bottom - rect.top) as u32,
        }
    }
    #[cfg(not(target_os = "windows"))]
    WorkArea { x: 0, y: 0, width: 1920, height: 1040 }
}

#[tauri::command]
pub fn set_creature_bounds(
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    bounds: tauri::State<'_, BoundsState>,
) {
    let mut b = bounds.lock().unwrap();
    b.x = x;
    b.y = y;
    b.width = width;
    b.height = height;
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
}
