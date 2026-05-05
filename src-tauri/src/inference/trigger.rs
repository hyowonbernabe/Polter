use crate::classifier::signals::SignalZScores;
use crate::classifier::state_machine::StateMachine;
use crate::inference::{
    openrouter::{self, VoiceResponse},
    pool::PoolState,
    prompt,
};
use crate::settings;
use crate::sleep::SleepState;
use crate::storage::{queries, DbPools};
use std::sync::{Arc, Mutex};
use tauri::Emitter;

const DEDUP_SUPPRESS_AT: i64 = 4;

pub struct InferenceEngine {
    pub last_inference_ms: u64,
    pub state_committed_ms: u64,
    pub session_active_secs: u64,
    pub last_error: Option<String>,
    /// Latest z-scores written by the aggregator every 60 seconds.
    pub last_z: SignalZScores,
    /// Cold-start flag written by the aggregator every 60 seconds.
    pub cold_start: bool,
}

impl InferenceEngine {
    pub fn new() -> Self {
        Self {
            last_inference_ms: 0,
            state_committed_ms: 0,
            session_active_secs: 0,
            last_error: None,
            last_z: SignalZScores::default(),
            cold_start: true,
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
    pub tier: String,
    pub state: String,
    pub insight: String,
    pub extended: String,
    #[serde(rename = "type")]
    pub insight_type: String,
    pub is_first_ever: bool,
}

pub async fn tick_voice<R: tauri::Runtime>(
    engine: Arc<Mutex<InferenceEngine>>,
    state_machine: Arc<Mutex<StateMachine>>,
    sleep_state: &SleepState,
    pools: &DbPools,
    app_handle: &tauri::AppHandle<R>,
    pool_state: &mut PoolState,
    session_start_ms: u64,
) {
    // Guard: sleep / privacy mode
    if sleep_state.lock().unwrap().is_paused() {
        return;
    }

    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let (hour, dow) = crate::classifier::local_time_parts();
    let session_secs = now_ms.saturating_sub(session_start_ms) / 1000;

    let (z_scores, cold_start) = {
        let eng = engine.lock().unwrap();
        (eng.last_z.clone(), eng.cold_start)
    };

    // No API key: speak from the pre-written pool
    let api_key = match settings::get_api_key(app_handle) {
        Some(k) => {
            engine.lock().unwrap().last_error = None;
            k
        }
        None => {
            engine.lock().unwrap().last_error =
                Some("no API key -- add one in Settings".to_string());
            let text = pool_state.get_mutter(hour as u32, session_secs);
            emit_mutter(app_handle, &text);
            return;
        }
    };

    // Build prompt context
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

    let signal_deviations = vec![
        ("typing_speed".to_string(),    z_scores.typing_speed),
        ("error_rate".to_string(),      z_scores.error_rate),
        ("mouse_speed".to_string(),     z_scores.mouse_speed),
        ("mouse_jitter".to_string(),    z_scores.mouse_jitter),
        ("pause_frequency".to_string(), z_scores.pause_frequency),
        ("app_switch_rate".to_string(), z_scores.app_switch_rate),
    ];

    let ctx = prompt::PromptContext {
        state: current_state.clone(),
        state_duration_mins,
        signal_deviations,
        hour: hour as u32,
        day_of_week: dow as u32,
        prior_occurrences: 0,
        cold_start,
        session_mins: session_secs / 60,
    };

    let system = prompt::build_system_prompt();
    let user = prompt::build_user_message(&ctx);

    tracing::info!(
        "[voice] calling openrouter -- state: {} session: {}m",
        current_state,
        session_secs / 60
    );

    match openrouter::call_openrouter(&api_key, system, &user).await {
        Err(e) => {
            tracing::warn!("[voice] call failed: {e}");
            engine.lock().unwrap().last_error = Some(e);
            // Fallback to pre-written pool on API failure
            let text = pool_state.get_mutter(hour as u32, session_secs);
            emit_mutter(app_handle, &text);
        }
        Ok(VoiceResponse::Mutter(text)) => {
            engine.lock().unwrap().last_error = None;
            engine.lock().unwrap().last_inference_ms = now_ms;
            tracing::info!("[voice] mutter emitted");
            emit_mutter(app_handle, &text);
        }
        Ok(VoiceResponse::Insight(insight)) => {
            engine.lock().unwrap().last_error = None;

            // Dedup: insight types seen 4+ times in 48h are suppressed; mutters never are
            let dedup_count =
                queries::get_dedup_count_48h(pools.read.as_ref(), &insight.insight_type, now_ms)
                    .await
                    .unwrap_or(0);

            if insight.insight_type != "anomaly" && dedup_count >= DEDUP_SUPPRESS_AT {
                tracing::info!(
                    "[voice] suppressed -- {} seen {} times in 48h",
                    insight.insight_type,
                    dedup_count
                );
                // Emit a pool mutter rather than going silent
                let text = pool_state.get_mutter(hour as u32, session_secs);
                emit_mutter(app_handle, &text);
                return;
            }

            let is_first_ever = queries::get_total_insight_count(pools.read.as_ref())
                .await
                .unwrap_or(1) == 0;

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

            let _ = queries::upsert_dedup_entry(
                pools.write.as_ref(),
                &insight.insight_type,
                now_ms as i64,
            )
            .await;

            engine.lock().unwrap().last_inference_ms = now_ms;

            let insight_state_copy = insight.state.clone();

            let _ = app_handle.emit(
                "insight_ready",
                InsightReadyPayload {
                    tier: "insight".to_string(),
                    state: insight.state,
                    insight: insight.insight,
                    extended: insight.extended,
                    insight_type: insight.insight_type,
                    is_first_ever,
                },
            );

            if let Some(tray) = app_handle.tray_by_id("main") {
                let (r, g, b) = crate::tray::state_to_tray_color(&insight_state_copy);
                let rgba = crate::tray::tray_icon_rgba_with_dot(r, g, b, true);
                let icon = tauri::image::Image::new_owned(rgba, 32, 32);
                let _ = tray.set_icon(Some(icon));
            }

            tracing::info!("[voice] insight emitted");
        }
    }
}

fn emit_mutter<R: tauri::Runtime>(app: &tauri::AppHandle<R>, text: &str) {
    let _ = app.emit(
        "insight_ready",
        InsightReadyPayload {
            tier: "mutter".to_string(),
            state: String::new(),
            insight: text.to_string(),
            extended: String::new(),
            insight_type: String::new(),
            is_first_ever: false,
        },
    );
}
