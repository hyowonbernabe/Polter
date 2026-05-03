mod click_through;
mod commands;

use std::sync::{Arc, Mutex};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

pub fn run() {
    let bounds: commands::BoundsState = Arc::new(Mutex::new(click_through::Rect::default()));

    tauri::Builder::default()
        // Single instance MUST be first per architecture rules.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(bounds.clone())
        .invoke_handler(tauri::generate_handler![
            commands::get_work_area,
            commands::set_creature_bounds,
        ])
        .setup(move |app| {
            // Enable Windows startup autolaunch on first run.
            use tauri_plugin_autostart::ManagerExt;
            let autostart = app.autolaunch();
            if !autostart.is_enabled()? {
                autostart.enable()?;
            }

            // Size the window to the primary monitor work area, then show it.
            // The window starts hidden (visible: false in tauri.conf.json) so
            // there is no flash before it is correctly positioned.
            let window = app.get_webview_window("main").expect("main window missing");
            let wa = commands::get_work_area();
            window.set_position(tauri::PhysicalPosition::new(wa.x, wa.y))?;
            window.set_size(tauri::PhysicalSize::new(wa.width, wa.height))?;
            window.show()?;

            // Signal to the React frontend that the backend is ready.
            app.emit("wisp_ready", commands::WispReadyPayload {
                version: app.package_info().version.to_string(),
            })?;

            // System tray: icon + Quit.
            let quit = MenuItemBuilder::with_id("quit", "Quit Wisp").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&quit]).build()?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| {
                    if event.id().as_ref() == "quit" {
                        app.exit(0);
                    }
                })
                .build(app)?;

            // Start the ~60fps click-through polling loop.
            click_through::start(app.handle().clone(), bounds.clone());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Wisp");
}
