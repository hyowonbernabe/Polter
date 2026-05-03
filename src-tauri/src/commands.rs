#[tauri::command]
pub fn get_work_area() -> serde_json::Value {
    serde_json::json!({ "x": 0, "y": 0, "width": 1920, "height": 1080 })
}

#[tauri::command]
pub fn set_creature_bounds(_x: f64, _y: f64, _width: f64, _height: f64) {}
