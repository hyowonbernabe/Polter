use crate::classifier::signals::SignalZScores;
use crate::classifier::state_machine::StateMachine;
use crate::inference::{openrouter, prompt};
use crate::settings;
use crate::sleep::SleepState;
use crate::storage::{queries, DbPools};
use std::sync::{Arc, Mutex};
use tauri::Emitter;

const DAILY_CAP: i64 = 3;
const FLOOR_MINS: u64 = 90;
const MIN_ACTIVE_SECS: u64 = 5 * 60;
const DEDUP_SUPPRESS_AT: i64 = 4;

#[derive(Debug, Clone)]
pub enum TriggerKind {
    StateTransition,
    Anomaly,
    TimerFloor,
}

pub struct InferenceEngine {
    pub last_inference_ms: u64,
    pub state_committed_ms: u64,
    pub session_active_secs: u64,
}

impl InferenceEngine {
    pub fn new() -> Self {
        Self {
            last_inference_ms: 0,
            state_committed_ms: 0,
            session_active_secs: 0,
        }
    }

    pub fn on_state_committed(&mut self, now_ms: u64) {
        self.state_committed_ms = now_ms;
    }

    pub fn tick_active(&mut self, secs: u64) {
        self.session_active_secs += secs;
    }

    pub fn reset_session(&mut self) {
        self.session_active_secs = 0;
        self.state_committed_ms = 0;
    }
}

#[derive(serde::Serialize, Clone)]
pub struct InsightReadyPayload {
    pub state: String,
    pub insight: String,
    pub extended: String,
    #[serde(rename = "type")]
    pub insight_type: String,
    pub is_first_ever: bool,
}

pub async fn maybe_trigger<R: tauri::Runtime>(
    engine: Arc<Mutex<InferenceEngine>>,
    trigger: TriggerKind,
    z_scores: &SignalZScores,
    state_machine: Arc<Mutex<StateMachine>>,
    cold_start: bool,
    sleep_state: &SleepState,
    pools: &DbPools,
    app_handle: &tauri::AppHandle<R>,
) {
    // Guard: sleep / privacy mode
    if sleep_state.lock().unwrap().is_paused() {
        return;
    }

    // Guard: API key must exist
    let api_key = match settings::get_api_key() {
        Some(k) => k,
        None => return,
    };

    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    // Guard: 5-minute active floor
    {
        let eng = engine.lock().unwrap();
        if eng.session_active_secs < MIN_ACTIVE_SECS {
            return;
        }

        // Guard: 90-minute floor for TimerFloor trigger
        if matches!(trigger, TriggerKind::TimerFloor) {
            let elapsed_mins = now_ms.saturating_sub(eng.last_inference_ms) / 60_000;
            if elapsed_mins < FLOOR_MINS {
                return;
            }
        }
    }

    // Guard: daily cap
    let day_start_ms = {
        let now = chrono::Local::now();
        let midnight = now
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        midnight
            .and_local_timezone(chrono::Local)
            .single()
            .map(|dt| dt.timestamp_millis())
            .unwrap_or(0)
    };

    let daily_count = queries::get_daily_insight_count(pools.read.as_ref(), day_start_ms)
        .await
        .unwrap_or(0);
    if daily_count >= DAILY_CAP {
        return;
    }

    // Build context for the prompt
    let (current_state, state_duration_mins) = {
        let sm = state_machine.lock().unwrap();
        let state = sm.current_state.as_str().to_string();
        let committed_ms = engine.lock().unwrap().state_committed_ms;
        let duration_mins = if committed_ms > 0 {
            now_ms.saturating_sub(committed_ms) / 60_000
        } else {
            0
        };
        (state, duration_mins)
    };

    let (hour, dow) = crate::classifier::local_time_parts();

    let signal_deviations = vec![
        ("typing_speed".to_string(), z_scores.typing_speed),
        ("error_rate".to_string(), z_scores.error_rate),
        ("mouse_speed".to_string(), z_scores.mouse_speed),
        ("mouse_jitter".to_string(), z_scores.mouse_jitter),
        ("pause_frequency".to_string(), z_scores.pause_frequency),
        ("app_switch_rate".to_string(), z_scores.app_switch_rate),
    ];

    let ctx = prompt::PromptContext {
        state: current_state.clone(),
        state_duration_mins,
        signal_deviations,
        hour: hour as u32,
        day_of_week: dow as u32,
        prior_occurrences: 0, // we'll do a post-call dedup check; pre-call count not needed
        cold_start,
    };

    // Check first-ever BEFORE inserting so we know if this will be insight #1
    let is_first_ever = queries::get_total_insight_count(pools.read.as_ref())
        .await
        .unwrap_or(1) == 0;

    let system = prompt::build_system_prompt();
    let user = prompt::build_user_message(&ctx);

    tracing::info!(
        "[inference] calling openrouter — trigger: {:?} state: {} duration: {}m",
        trigger, current_state, state_duration_mins
    );

    match openrouter::call_openrouter(&api_key, system, &user).await {
        Err(e) => {
            tracing::warn!("[inference] call failed: {e}");
        }
        Ok(insight) => {
            // Post-call dedup: anomaly type is never suppressed
            let dedup_count =
                queries::get_dedup_count_48h(pools.read.as_ref(), &insight.insight_type, now_ms)
                    .await
                    .unwrap_or(0);

            if insight.insight_type != "anomaly" && dedup_count >= DEDUP_SUPPRESS_AT {
                tracing::info!(
                    "[inference] suppressed — {} seen {} times in 48h",
                    insight.insight_type, dedup_count
                );
                return;
            }

            // Persist insight
            let _ = queries::insert_insight(
                pools.write.as_ref(),
                now_ms as i64,
                None,
                &insight.state,
                &insight.insight,
                &insight.extended,
                &insight.insight_type,
            )
            .await;

            // Update dedup log
            let _ = queries::upsert_dedup_entry(
                pools.write.as_ref(),
                &insight.insight_type,
                now_ms as i64,
            )
            .await;

            // Mark engine time
            engine.lock().unwrap().last_inference_ms = now_ms;

            let insight_state_copy = insight.state.clone();

            let _ = app_handle.emit(
                "insight_ready",
                InsightReadyPayload {
                    state: insight.state,
                    insight: insight.insight,
                    extended: insight.extended,
                    insight_type: insight.insight_type,
                    is_first_ever,
                },
            );

            // Show tray dot — a pending bubble is waiting
            if let Some(tray) = app_handle.tray_by_id("main") {
                let (r, g, b) = crate::tray::state_to_tray_color(&insight_state_copy);
                let rgba = crate::tray::tray_icon_rgba_with_dot(r, g, b, true);
                let icon = tauri::image::Image::new_owned(rgba, 32, 32);
                let _ = tray.set_icon(Some(icon));
            }

            tracing::info!("[inference] insight emitted");
        }
    }
}
