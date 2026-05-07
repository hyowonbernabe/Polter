use tauri::Runtime;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "polter-settings.json";
const API_KEY: &str = "openrouter_api_key";

pub fn get_api_key<R: Runtime>(app: &tauri::AppHandle<R>) -> Option<String> {
    let store = app.store(STORE_FILE).ok()?;
    store.get(API_KEY)?.as_str().map(|s| s.to_string())
}

pub fn set_api_key<R: Runtime>(app: &tauri::AppHandle<R>, key: &str) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.set(API_KEY, serde_json::Value::String(key.to_string()));
    store.save().map_err(|e| e.to_string())
}

pub fn clear_api_key<R: Runtime>(app: &tauri::AppHandle<R>) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.delete(API_KEY);
    store.save().map_err(|e| e.to_string())
}

pub fn has_api_key<R: Runtime>(app: &tauri::AppHandle<R>) -> bool {
    get_api_key(app).is_some()
}
