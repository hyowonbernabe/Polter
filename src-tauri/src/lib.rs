pub mod classifier;
mod click_through;
mod commands;
pub mod inference;
pub mod pipeline;
mod preferences;
pub mod sensors;
pub mod session;
pub mod settings;
pub mod sleep;
pub mod storage;
pub mod tray;

use chrono::Timelike;
use classifier::{
    anomaly::AnomalyDetector,
    daily_summary::DailySummaryAccumulator,
    state_machine::StateMachine,
};
use std::sync::{Arc, Mutex, RwLock};
use tauri::{
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, SubmenuBuilder},
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
    let bubble_bounds: commands::BubbleBoundsState = Arc::new(Mutex::new(None));
    let drag_active: commands::DragActiveState = Arc::new(std::sync::atomic::AtomicBool::new(false));
    let sleep_state: sleep::SleepState = Arc::new(Mutex::new(sleep::SleepStateInner::default()));
    let tray_dot: commands::TrayDotState = Arc::new(Mutex::new(false));

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
        .manage(bubble_bounds.clone())
        .manage(drag_active.clone())
        .manage(sleep_state.clone())
        .manage(tray_dot.clone())
        .invoke_handler(tauri::generate_handler![
            commands::get_debug_info,
            commands::get_work_area,
            commands::get_monitors,
            commands::set_drag_active,
            commands::set_creature_bounds,
            commands::set_api_key,
            commands::get_api_key,
            commands::clear_api_key,
            commands::has_api_key,
            commands::get_sleep_status,
            commands::toggle_sleep,
            commands::toggle_privacy,
            commands::set_sleep_schedule,
            commands::dismiss_insight,
            commands::set_bubble_bounds,
            commands::clear_bubble_bounds,
            commands::get_dashboard_data,
            commands::get_current_state_info,
            commands::open_dashboard,
            commands::close_dashboard,
            commands::toggle_dashboard,
            commands::quit_app,
            commands::open_settings,
            commands::close_settings,
            commands::clear_snapshots,
            commands::export_insights,
            commands::is_onboarding_complete,
            commands::complete_onboarding,
            commands::get_tier2_permissions,
            commands::set_tier2_permissions,
            commands::open_onboarding,
            commands::dismiss_onboarding,
            commands::reset_onboarding,
            commands::get_buffer_stats,
            commands::get_live_status,
        ])
        .setup(move |app| {
            // Autolaunch: release builds only.
            // Dev builds connect to localhost:5173 (Vite dev server). Autolaunching a dev
            // binary after reboot fails with a network error because the dev server isn't running.
            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart = app.autolaunch();
                #[cfg(debug_assertions)]
                {
                    // Remove any stale autostart entry left by a previous dev-build run.
                    if autostart.is_enabled()? {
                        let _ = autostart.disable();
                    }
                }
                #[cfg(not(debug_assertions))]
                {
                    if !autostart.is_enabled()? {
                        autostart.enable()?;
                    }
                }
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
            app.manage(ring.clone());
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
            let inference_engine: Arc<Mutex<inference::InferenceEngine>> =
                Arc::new(Mutex::new(inference::InferenceEngine::new()));
            app.manage(state_machine.clone());
            app.manage(anomaly_detector.clone());
            app.manage(summary_acc.clone());
            app.manage(inference_engine.clone());

            // Load persisted sleep schedule before the schedule watcher starts.
            {
                let schedule = preferences::load_sleep_schedule(app.handle());
                let mut s = sleep_state.lock().unwrap();
                s.schedule_enabled      = schedule.enabled;
                s.schedule_start_hour   = schedule.start_hour;
                s.schedule_start_minute = schedule.start_minute;
                s.schedule_end_hour     = schedule.end_hour;
                s.schedule_end_minute   = schedule.end_minute;
            }

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
                sleep_state.clone(),
                inference_engine.clone(),
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
                let inf_wake = inference_engine.clone();
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
                        inf_wake.lock().unwrap().reset_session();
                        let is_returning = last_end.map_or(false, |end| {
                            now_ms.saturating_sub(end as u64) >= 4 * 60 * 60 * 1_000
                        });
                        if is_returning {
                            let _ = app_wake.emit("returning_user", ());
                        }
                    }
                });
            }

            // Size the main window to the full virtual screen (spans all monitors).
            // Only show it if onboarding is already complete.
            let window = app.get_webview_window("main").expect("main window missing");
            let (vx, vy, vw, vh) = virtual_screen_rect();
            window.set_position(tauri::PhysicalPosition::new(vx, vy))?;
            window.set_size(tauri::PhysicalSize::new(vw, vh))?;

            let onboarding_done = commands::is_onboarding_complete(app.handle().clone());
            if onboarding_done {
                window.show()?;
            } else {
                if let Some(ob) = app.get_webview_window("onboarding") {
                    ob.center()?;
                    ob.show()?;
                    ob.set_focus()?;
                }
            }

            // Signal to the React frontend that the backend is ready.
            // Delay briefly so the OS has time to process SetWindowPos/SetWindowSize —
            // without this, get_monitors() may still see a stale outer_position() and
            // compute wrong monitor coordinates relative to the window origin.
            {
                let app_ready = app.handle().clone();
                let version = app.package_info().version.to_string();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
                    let _ = app_ready.emit("wisp_ready", commands::WispReadyPayload { version });
                });
            }

            // Emit initial inference mode: "cloud" if API key set, otherwise "unavailable".
            let initial_mode = if settings::has_api_key(app.handle()) { "cloud" } else { "unavailable" };
            app.emit("inference_mode_changed", initial_mode)?;

            // System tray: Sleep · Privacy Mode · [Developer] · Quit.
            // CheckMenuItems show a checkmark when active.
            let dashboard_item = MenuItemBuilder::with_id("open_dashboard", "Open Dashboard").build(app)?;
            let settings_item  = MenuItemBuilder::with_id("open_settings",  "Settings").build(app)?;
            let sleep_check   = CheckMenuItemBuilder::with_id("sleep_toggle",   "Sleep")
                .checked(false).build(app)?;
            let privacy_check = CheckMenuItemBuilder::with_id("privacy_toggle", "Privacy Mode")
                .checked(false).build(app)?;
            let debug_check = CheckMenuItemBuilder::with_id("debug_toggle", "Debug Mode")
                .checked(false).build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit Wisp").build(app)?;

            let menu = if cfg!(debug_assertions) {
                let dev_flow      = MenuItemBuilder::with_id("dev_flow",         "Flow Detection").build(app)?;
                let dev_fatigue   = MenuItemBuilder::with_id("dev_fatigue",      "Fatigue Signal").build(app)?;
                let dev_break     = MenuItemBuilder::with_id("dev_break",        "Break Signal").build(app)?;
                let dev_anomaly   = MenuItemBuilder::with_id("dev_anomaly",      "Anomaly").build(app)?;
                let dev_first     = MenuItemBuilder::with_id("dev_first_ever",   "First-Ever Insight").build(app)?;
                let dev_mutter    = MenuItemBuilder::with_id("dev_mutter",       "Test Mutter").build(app)?;
                let dev_onboarding = MenuItemBuilder::with_id("dev_onboarding",  "Reset Onboarding").build(app)?;
                let dev_goal       = MenuItemBuilder::with_id("dev_goal",        "Trigger Goal").build(app)?;
                let dev_flee       = MenuItemBuilder::with_id("dev_flee",        "Trigger Flee").build(app)?;
                let dev_sub = SubmenuBuilder::with_id(app, "dev_menu", "Developer")
                    .items(&[&dev_flow, &dev_fatigue, &dev_break, &dev_anomaly, &dev_first, &dev_mutter, &dev_onboarding, &dev_goal, &dev_flee])
                    .build()?;
                MenuBuilder::new(app).items(&[&dashboard_item, &settings_item, &sleep_check, &privacy_check, &dev_sub, &debug_check, &quit]).build()?
            } else {
                MenuBuilder::new(app).items(&[&dashboard_item, &settings_item, &sleep_check, &privacy_check, &debug_check, &quit]).build()?
            };

            // Clone items: one pair for the event handler, one pair for the schedule watcher.
            let sleep_ev   = sleep_check.clone();
            let privacy_ev = privacy_check.clone();
            let sleep_sch   = sleep_check.clone();
            let privacy_sch = privacy_check.clone();
            let debug_ev   = debug_check.clone();

            let (tr, tg, tb) = crate::tray::state_to_tray_color("rest");
            let init_rgba = crate::tray::tray_icon_rgba(tr, tg, tb);
            let init_icon = tauri::image::Image::new_owned(init_rgba, 32, 32);
            TrayIconBuilder::with_id("main")
                .icon(init_icon)
                .menu(&menu)
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "quit" => app.exit(0),

                        "open_dashboard" => {
                            let _ = commands::do_open_dashboard(app);
                        }

                        "open_settings" => {
                            let _ = commands::do_open_settings(app);
                        }

                        // Sleep and Privacy are mutually exclusive.
                        // Enabling one always disables the other.
                        "sleep_toggle" => {
                            let sleep_st = app.state::<sleep::SleepState>().inner().clone();
                            let pools    = app.state::<storage::DbPools>().inner().clone();
                            let sid      = app.state::<session::SessionId>().inner().clone();
                            let summary  = app.state::<Arc<Mutex<classifier::daily_summary::DailySummaryAccumulator>>>().inner().clone();
                            let handle   = app.clone();
                            let sleep_item   = sleep_ev.clone();
                            let privacy_item = privacy_ev.clone();
                            tauri::async_runtime::spawn(async move {
                                let new_sleeping = {
                                    let mut s = sleep_st.lock().unwrap();
                                    s.sleeping = !s.sleeping;
                                    s.schedule_triggered = false;
                                    s.privacy = false; // mutually exclusive
                                    s.sleeping
                                };
                                let _ = sleep_item.set_checked(new_sleeping);
                                let _ = privacy_item.set_checked(false);
                                let _ = commands::apply_sleep_change(new_sleeping, pools, sid, summary, handle).await;
                            });
                        }

                        "privacy_toggle" => {
                            let sleep_st = app.state::<sleep::SleepState>().inner().clone();
                            let pools    = app.state::<storage::DbPools>().inner().clone();
                            let sid      = app.state::<session::SessionId>().inner().clone();
                            let handle   = app.clone();
                            let sleep_item   = sleep_ev.clone();
                            let privacy_item = privacy_ev.clone();
                            tauri::async_runtime::spawn(async move {
                                let (new_privacy, was_sleeping) = {
                                    let mut s = sleep_st.lock().unwrap();
                                    let was = s.sleeping;
                                    s.privacy = !s.privacy;
                                    s.sleeping = false; // mutually exclusive
                                    s.schedule_triggered = false;
                                    (s.privacy, was)
                                };
                                let _ = privacy_item.set_checked(new_privacy);
                                let _ = sleep_item.set_checked(false);
                                // If toggling privacy on while sleeping, start a fresh session.
                                if was_sleeping && new_privacy {
                                    let _ = session::start_new_session(&pools, &sid).await;
                                }
                                let _ = handle.emit("sleep_changed", commands::SleepChangedPayload {
                                    sleeping: false,
                                    privacy: new_privacy,
                                });
                            });
                        }

                        "debug_toggle" => {
                            let enabled = debug_ev.is_checked().unwrap_or(false);
                            let _ = app.emit("debug_mode_changed", enabled);
                        }

                        id if cfg!(debug_assertions) && id.starts_with("dev_") => {
                            if id == "dev_onboarding" {
                                let _ = commands::reset_onboarding(app.clone());
                                return;
                            }
                            if id == "dev_goal" {
                                let _ = app.emit("dev_trigger_goal", ());
                                return;
                            }
                            if id == "dev_flee" {
                                let _ = app.emit("wisp://fullscreen-detected", ());
                                return;
                            }
                            if id == "dev_mutter" {
                                let _ = app.emit(
                                    "insight_ready",
                                    crate::inference::trigger::InsightReadyPayload {
                                        tier: "mutter".to_string(),
                                        state: String::new(),
                                        insight: "dev test mutter. something dry and low-key.".to_string(),
                                        extended: String::new(),
                                        insight_type: String::new(),
                                        is_first_ever: false,
                                    },
                                );
                                return;
                            }
                            let insight_type = match id {
                                "dev_flow"       => "flow_detection",
                                "dev_fatigue"    => "fatigue_signal",
                                "dev_break"      => "break_signal",
                                "dev_anomaly"    => "anomaly",
                                "dev_first_ever" => "flow_detection",
                                _                => return,
                            };
                            let is_first_ever = id == "dev_first_ever";
                            let _ = app.emit(
                                "insight_ready",
                                crate::inference::trigger::InsightReadyPayload {
                                    tier: "insight".to_string(),
                                    state: "focus".to_string(),
                                    insight: format!("dev test: {} insight.", insight_type.replace('_', " ")),
                                    extended: "developer-triggered test insight. bypasses all inference guards and fires immediately.".to_string(),
                                    insight_type: insight_type.to_string(),
                                    is_first_ever,
                                },
                            );
                            // Show tray dot
                            if let Some(tray) = app.tray_by_id("main") {
                                let (r, g, b) = crate::tray::state_to_tray_color("focus");
                                let rgba = crate::tray::tray_icon_rgba_with_dot(r, g, b, true);
                                let icon = tauri::image::Image::new_owned(rgba, 32, 32);
                                let _ = tray.set_icon(Some(icon));
                            }
                        }

                        _ => {}
                    }
                })
                .build(app)?;

            // Auto-sleep schedule watcher — checks every 60 seconds.
            {
                let sleep_st   = sleep_state.clone();
                let pools_sch  = pools.clone();
                let sid_sch    = session_id.clone();
                let sum_sch    = summary_acc.clone();
                let handle_sch = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    let mut ticker = tokio::time::interval(tokio::time::Duration::from_secs(60));
                    ticker.tick().await;
                    loop {
                        ticker.tick().await;
                        let (enabled, start_h, start_m, end_h, end_m, currently_sleeping, triggered) = {
                            let s = sleep_st.lock().unwrap();
                            (s.schedule_enabled, s.schedule_start_hour, s.schedule_start_minute,
                             s.schedule_end_hour, s.schedule_end_minute, s.sleeping, s.schedule_triggered)
                        };
                        if !enabled { continue; }

                        let now = chrono::Local::now();
                        let in_window = sleep::in_schedule(
                            start_h, start_m, end_h, end_m,
                            now.hour() as u8, now.minute() as u8,
                        );

                        if in_window && !currently_sleeping {
                            {
                                let mut s = sleep_st.lock().unwrap();
                                s.sleeping = true;
                                s.privacy = false;
                                s.schedule_triggered = true;
                            }
                            let _ = sleep_sch.set_checked(true);
                            let _ = privacy_sch.set_checked(false);
                            let _ = commands::apply_sleep_change(
                                true, pools_sch.clone(), sid_sch.clone(), sum_sch.clone(), handle_sch.clone(),
                            ).await;
                        } else if !in_window && currently_sleeping && triggered {
                            {
                                let mut s = sleep_st.lock().unwrap();
                                s.sleeping = false;
                                s.schedule_triggered = false;
                            }
                            let _ = sleep_sch.set_checked(false);
                            let _ = commands::apply_sleep_change(
                                false, pools_sch.clone(), sid_sch.clone(), sum_sch.clone(), handle_sch.clone(),
                            ).await;
                        }
                    }
                });
            }

            // Start the ~60fps click-through polling loop.
            click_through::start(app.handle().clone(), bounds.clone(), bubble_bounds.clone(), drag_active.clone());

            // Start the 5-minute always-on voice ticker.
            // 60-second warmup on startup before the first utterance.
            {
                let engine_v = inference_engine.clone();
                let sm_v     = state_machine.clone();
                let sleep_v  = sleep_state.clone();
                let pools_v  = pools.clone();
                let app_v    = app.handle().clone();
                let start_ms = now_setup_ms;
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
                    let mut pool_state = crate::inference::pool::PoolState::new(start_ms);
                    let mut ticker = tokio::time::interval(
                        tokio::time::Duration::from_secs(5 * 60),
                    );
                    loop {
                        ticker.tick().await;
                        crate::inference::trigger::tick_voice(
                            engine_v.clone(),
                            sm_v.clone(),
                            &sleep_v,
                            &pools_v,
                            &app_v,
                            &mut pool_state,
                            start_ms,
                        )
                        .await;
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Wisp");
}
