pub mod classifier;
mod click_through;
mod commands;
pub mod pipeline;
pub mod sensors;
pub mod session;
pub mod settings;
pub mod storage;
pub mod tray;

use classifier::{
    anomaly::AnomalyDetector,
    daily_summary::DailySummaryAccumulator,
    state_machine::StateMachine,
};
use std::sync::{Arc, Mutex, RwLock};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Emitter, Manager,
};

/// Returns (x, y, width, height) of the bounding rectangle covering all monitors.
/// On Windows this is the virtual screen; falls back to 1920×1080 on other platforms.
fn virtual_screen_rect() -> (i32, i32, u32, u32) {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::{
            GetSystemMetrics, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN,
            SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN,
        };
        let x = unsafe { GetSystemMetrics(SM_XVIRTUALSCREEN) };
        let y = unsafe { GetSystemMetrics(SM_YVIRTUALSCREEN) };
        let w = unsafe { GetSystemMetrics(SM_CXVIRTUALSCREEN) };
        let h = unsafe { GetSystemMetrics(SM_CYVIRTUALSCREEN) };
        (x, y, w as u32, h as u32)
    }
    #[cfg(not(target_os = "windows"))]
    (0, 0, 1920, 1080)
}

pub fn run() {
    tracing_subscriber::fmt::init();

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
            commands::get_debug_info,
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
            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let db_path_str = db_path.to_string_lossy().to_string();
            let pools = tauri::async_runtime::block_on(storage::init(&db_path_str))?;
            app.manage(pools.clone());

            // Shared pipeline state.
            let ring: Arc<Mutex<pipeline::RingBuffer>> =
                Arc::new(Mutex::new(pipeline::RingBuffer::new(10_000)));
            let system_snap: Arc<RwLock<sensors::system::SystemSnapshot>> =
                Arc::new(RwLock::new(sensors::system::SystemSnapshot::default()));
            let session_id: session::SessionId = Arc::new(Mutex::new(None));
            app.manage(session_id.clone());

            // Classifier state.
            let now_setup_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;
            let state_machine: Arc<Mutex<StateMachine>> =
                Arc::new(Mutex::new(StateMachine::new()));
            let anomaly_detector: Arc<Mutex<AnomalyDetector>> =
                Arc::new(Mutex::new(AnomalyDetector::new()));
            let summary_acc: Arc<Mutex<DailySummaryAccumulator>> =
                Arc::new(Mutex::new(DailySummaryAccumulator::new(now_setup_ms)));
            app.manage(state_machine.clone());
            app.manage(anomaly_detector.clone());
            app.manage(summary_acc.clone());

            // Start the first session.
            {
                let pools_ref = pools.clone();
                let sid_ref = session_id.clone();
                tauri::async_runtime::block_on(async move {
                    let _ = session::start_new_session(&pools_ref, &sid_ref).await;
                });
            }

            // Wake signal: system poller notifies this instead of emitting a frontend event.
            let wake_signal = Arc::new(tokio::sync::Notify::new());

            // Start sensors.
            sensors::input_host::start(ring.clone());
            sensors::system::start(app.handle().clone(), system_snap.clone(), wake_signal.clone());

            // Start 60-second aggregation loop.
            pipeline::aggregator::start(
                ring.clone(),
                system_snap.clone(),
                session_id.clone(),
                pools.clone(),
                app.handle().clone(),
                state_machine.clone(),
                anomaly_detector.clone(),
                summary_acc.clone(),
            );

            // Start inactivity watcher (ends session after 10 min idle).
            session::start_inactivity_watcher(
                ring.clone(), pools.clone(), session_id.clone(), summary_acc.clone(),
            );

            // Handle sleep/wake: loop on the internal Notify rather than the event bus.
            {
                let pools_wake = pools.clone();
                let sid_wake = session_id.clone();
                let summary_wake = summary_acc.clone();
                let app_wake = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    loop {
                        wake_signal.notified().await;
                        let now_ms = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis() as u64;
                        let last_end = crate::storage::queries::get_last_session_end_ms(
                            pools_wake.read.as_ref(),
                        ).await.ok().flatten();
                        let _ = session::handle_wake(&pools_wake, &sid_wake).await;
                        session::finalize_session(&pools_wake, &summary_wake).await;
                        let is_returning = last_end.map_or(false, |end| {
                            now_ms.saturating_sub(end as u64) >= 4 * 60 * 60 * 1_000
                        });
                        if is_returning {
                            let _ = app_wake.emit("returning_user", ());
                        }
                    }
                });
            }

            // Size the window to the full virtual screen (spans all monitors), then show it.
            // Creature positioning is clamped to per-monitor work areas separately.
            let window = app.get_webview_window("main").expect("main window missing");
            let (vx, vy, vw, vh) = virtual_screen_rect();
            window.set_position(tauri::PhysicalPosition::new(vx, vy))?;
            window.set_size(tauri::PhysicalSize::new(vw, vh))?;
            window.show()?;

            // Signal to the React frontend that the backend is ready.
            app.emit("wisp_ready", commands::WispReadyPayload {
                version: app.package_info().version.to_string(),
            })?;

            // System tray: icon + Quit.
            let quit = MenuItemBuilder::with_id("quit", "Quit Wisp").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&quit]).build()?;
            TrayIconBuilder::with_id("main")
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
