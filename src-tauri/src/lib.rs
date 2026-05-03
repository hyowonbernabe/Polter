mod click_through;
mod commands;
pub mod pipeline;
pub mod sensors;
pub mod session;
pub mod settings;
pub mod storage;

use std::sync::{Arc, Mutex, RwLock};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Emitter, Listener, Manager,
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
            commands::set_api_key,
            commands::get_api_key,
            commands::clear_api_key,
            commands::has_api_key,
        ])
        .setup(move |app| {
            // Enable Windows startup autolaunch on first run.
            use tauri_plugin_autostart::ManagerExt;
            let autostart = app.autolaunch();
            if !autostart.is_enabled()? {
                autostart.enable()?;
            }

            // Initialize SQLite database.
            let db_path = app.path().app_data_dir()?.join("wisp.db");
            let db_path_str = db_path.to_string_lossy().to_string();
            let pools = tauri::async_runtime::block_on(storage::init(&db_path_str))?;
            let write_pool = pools.write.clone();

            // Shared pipeline state.
            let ring: Arc<Mutex<pipeline::RingBuffer>> =
                Arc::new(Mutex::new(pipeline::RingBuffer::new(10_000)));
            let system_snap: Arc<RwLock<sensors::system::SystemSnapshot>> =
                Arc::new(RwLock::new(sensors::system::SystemSnapshot::default()));
            let session_id: session::SessionId = Arc::new(Mutex::new(None));

            // Start the first session.
            {
                let pools_ref = pools.clone();
                let sid_ref = session_id.clone();
                tauri::async_runtime::block_on(async move {
                    let _ = session::start_new_session(&pools_ref, &sid_ref).await;
                });
            }

            // Start sensors.
            sensors::input_host::start(ring.clone());
            sensors::system::start(app.handle().clone(), system_snap.clone());

            // Start 60-second aggregation loop.
            pipeline::aggregator::start(
                ring.clone(),
                system_snap.clone(),
                session_id.clone(),
                write_pool,
            );

            // Start inactivity watcher (ends session after 10 min idle).
            session::start_inactivity_watcher(ring.clone(), pools.clone(), session_id.clone());

            // Handle sleep/wake events from the system poller.
            {
                let pools_wake = pools.clone();
                let sid_wake = session_id.clone();
                app.listen("wisp_wake", move |_event| {
                    let p = pools_wake.clone();
                    let s = sid_wake.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = session::handle_wake(&p, &s).await;
                    });
                });
            }

            // Size the window to the primary monitor work area, then show it.
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
