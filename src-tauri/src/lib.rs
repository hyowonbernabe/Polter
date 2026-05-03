mod click_through;
mod commands;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::get_work_area,
            commands::set_creature_bounds,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Wisp");
}
