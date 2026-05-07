use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use crate::commands::SleepScheduleInput;

pub fn load_sleep_schedule(app: &AppHandle) -> SleepScheduleInput {
    let Ok(store) = app.store("polter-settings.json") else {
        return SleepScheduleInput::default();
    };
    if let Some(val) = store.get("sleep_schedule") {
        if let Ok(s) = serde_json::from_value::<SleepScheduleInput>(val) {
            return s;
        }
    }
    SleepScheduleInput::default()
}

pub fn save_sleep_schedule(app: &AppHandle, schedule: &SleepScheduleInput) {
    let Ok(store) = app.store("polter-settings.json") else { return; };
    store.set(
        "sleep_schedule",
        serde_json::to_value(schedule).unwrap_or(serde_json::Value::Null),
    );
    let _ = store.save();
}
