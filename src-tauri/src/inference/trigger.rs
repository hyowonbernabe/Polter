use crate::classifier::daily_summary::DailySummaryAccumulator;
use crate::classifier::signals::SignalZScores;
use crate::classifier::state_machine::StateMachine;
use crate::inference::{
    openrouter::{self, VoiceResponse},
    pool::PoolState,
    prompt::{self, DayContext, MemoryContext, TodayContext, WeeklyContext},
    research,
};
use crate::settings;
use crate::sleep::SleepState;
use crate::storage::{queries, DbPools};
use std::sync::{Arc, Mutex};
use tauri::Emitter;

const DEDUP_SUPPRESS_AT: i64 = 4;
/// 7 days in milliseconds
const MEMORY_WINDOW_MS: u64 = 7 * 24 * 60 * 60 * 1_000;

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
    summary_acc: Arc<Mutex<DailySummaryAccumulator>>,
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
        ("undo_redo_rate".to_string(),  z_scores.undo_redo_rate),
        ("key_hold_ms".to_string(),     z_scores.key_hold_ms),
        ("save_rate".to_string(),       z_scores.save_rate),
        ("right_click_rate".to_string(), z_scores.right_click_rate),
        ("scroll_depth".to_string(),    z_scores.scroll_depth),
    ];

    // ── Fix: query actual prior_occurrences from DB ──────────────────────────
    let prior_occurrences = queries::get_state_insight_count_48h(
        pools.read.as_ref(), &current_state, now_ms,
    ).await.unwrap_or(0);

    // ── RAG: retrieve context for this tick ───────────────────────────────────

    // Today so far (from in-memory accumulator)
    let today_ctx = build_today_context(&summary_acc, now_ms);

    // Recent daily summaries (last 3 days, excluding today)
    let recent_days = build_recent_day_contexts(pools, dow as u32).await;

    // Polter's recent observations (last 7 days)
    let recent_memories = build_memory_contexts(pools, now_ms).await;

    // Weekly context (last 2 weekly summaries)
    let weekly_ctx = build_weekly_context(pools).await;

    // Session-time research chunk (included when session > 3h)
    let session_mins = session_secs / 60;
    let mut signal_research: Vec<String> = Vec::new();
    if session_mins > 180 {
        signal_research.push(research::SESSION_TIME.to_string());
    }
    // Per-signal research chunks (when |z| >= 1.5)
    for (name, z) in &signal_deviations {
        if let Some(chunk) = research::chunk_for_signal(name, *z) {
            signal_research.push(chunk.to_string());
        }
    }

    let ctx = prompt::PromptContext {
        state: current_state.clone(),
        state_duration_mins,
        signal_deviations,
        hour: hour as u32,
        day_of_week: dow as u32,
        prior_occurrences,
        cold_start,
        session_mins,
        today: today_ctx,
        recent_days,
        recent_memories,
        weekly: weekly_ctx,
        signal_research,
    };

    let system = prompt::build_system_prompt();
    let user = prompt::build_user_message(&ctx);

    tracing::info!(
        "[voice] calling openrouter -- state: {} session: {}m",
        current_state,
        session_mins
    );

    match openrouter::call_openrouter(&api_key, system, &user).await {
        Err(e) => {
            tracing::warn!("[voice] call failed: {e}");
            engine.lock().unwrap().last_error = Some(e);
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

            // Dedup: insight types seen 4+ times in 48h are suppressed
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
                let text = pool_state.get_mutter(hour as u32, session_secs);
                emit_mutter(app_handle, &text);
                return;
            }

            let is_first_ever = queries::get_total_insight_count(pools.read.as_ref())
                .await
                .unwrap_or(1) == 0;

            let insight_id = queries::insert_insight(
                pools.write.as_ref(),
                now_ms as i64,
                None,
                &insight.state,
                &insight.insight,
                &insight.extended,
                &insight.insight_type,
            )
            .await
            .unwrap_or(0);

            let _ = queries::upsert_dedup_entry(
                pools.write.as_ref(),
                &insight.insight_type,
                now_ms as i64,
            )
            .await;

            // ── Step 4: Save memory note ──────────────────────────────────────
            if let Some(ref note) = insight.memory_note {
                let trimmed = note.trim();
                if !trimmed.is_empty() && trimmed.len() <= 300 {
                    if let Err(e) = queries::insert_wisp_memory(
                        pools.write.as_ref(),
                        now_ms as i64,
                        &insight.state,
                        &insight.insight_type,
                        trimmed,
                        insight_id,
                    ).await {
                        tracing::warn!("[voice] memory note write failed: {e}");
                    }
                }
            }

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

// ── RAG context builders ──────────────────────────────────────────────────────

fn build_today_context(
    summary_acc: &Arc<Mutex<DailySummaryAccumulator>>,
    now_ms: u64,
) -> Option<TodayContext> {
    let (total, focus, calm, deep, spark, burn, fade, rest, longest) = {
        let acc = summary_acc.lock().unwrap();
        acc.peek_params(now_ms)
    };
    if total == 0 {
        return None;
    }
    let mut states = Vec::new();
    for (name, mins) in [
        ("focus", focus), ("calm", calm), ("deep", deep), ("spark", spark),
        ("burn", burn), ("fade", fade), ("rest", rest),
    ] {
        if mins > 0 { states.push((name.to_string(), mins)); }
    }
    Some(TodayContext {
        active_mins: total,
        session_count: 1, // current session only — completed earlier sessions not counted here
        states,
        longest_focus_mins: longest,
        insight_count: 0, // approximate — full count requires a DB query we skip for perf
    })
}

async fn build_recent_day_contexts(
    pools: &DbPools,
    current_dow: u32,
) -> Vec<DayContext> {
    let rows = queries::get_last_7_daily_summaries(pools.read.as_ref())
        .await
        .unwrap_or_default();

    let days_of_week = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

    let mut result = Vec::new();
    for (i, row) in rows.iter().enumerate() {
        // Skip today (i == 0 is most recent, which may be today)
        if i == 0 {
            // Check if this row is today
            let today_str = chrono::Local::now().format("%Y-%m-%d").to_string();
            if row.date == today_str { continue; }
        }

        let label = if i == 0 || (i == 1 && {
            let today_str = chrono::Local::now().format("%Y-%m-%d").to_string();
            rows[0].date == today_str
        }) {
            "yesterday".to_string()
        } else {
            // Figure out the day name from the date string
            let date_dow = parse_day_of_week(&row.date);
            let dow_name = date_dow.map(|d| days_of_week[d % 7].to_string())
                .unwrap_or_else(|| row.date.clone());

            // If it's the same day of week as today, prefix with "last"
            if date_dow == Some(current_dow as usize % 7) {
                format!("last {}", dow_name)
            } else {
                dow_name
            }
        };

        let mut states = Vec::new();
        for (name, mins) in [
            ("focus", row.focus_minutes),
            ("calm", row.calm_minutes),
            ("deep", row.deep_minutes),
            ("spark", row.spark_minutes),
            ("burn", row.burn_minutes),
            ("fade", row.fade_minutes),
            ("rest", row.rest_minutes),
        ] {
            if mins > 0 { states.push((name.to_string(), mins)); }
        }

        result.push(DayContext {
            label,
            active_mins: row.total_active_minutes,
            states,
            longest_focus_mins: row.longest_focus_block_minutes,
            burn_episodes: row.burn_minutes / 45, // approximate: burn_minutes / typical episode length
        });

        if result.len() >= 3 { break; }
    }

    result
}

async fn build_memory_contexts(pools: &DbPools, now_ms: u64) -> Vec<MemoryContext> {
    let since_ms = now_ms.saturating_sub(MEMORY_WINDOW_MS) as i64;
    let rows = queries::get_recent_wisp_memories(pools.read.as_ref(), since_ms, 5)
        .await
        .unwrap_or_default();

    rows.into_iter()
        .map(|r| MemoryContext {
            age_label: age_label(now_ms, r.timestamp_ms as u64),
            note: r.memory_note,
        })
        .collect()
}

async fn build_weekly_context(pools: &DbPools) -> Option<WeeklyContext> {
    let weeks = queries::get_recent_weekly_summaries(pools.read.as_ref(), 2)
        .await
        .unwrap_or_default();
    if weeks.is_empty() {
        return None;
    }
    let total_mins: i64 = weeks.iter().map(|w| w.total_active_mins).sum();
    let total_days: f64 = weeks.len() as f64 * 7.0;
    let avg_per_day = total_mins as f64 / total_days;
    Some(WeeklyContext {
        avg_active_mins_per_day: avg_per_day,
        focus_trend: None,
        burn_trend: None,
    })
}

/// Human-readable age label for a memory note timestamp.
fn age_label(now_ms: u64, ts_ms: u64) -> String {
    let diff_ms = now_ms.saturating_sub(ts_ms);
    let mins = diff_ms / 60_000;
    let hours = mins / 60;
    let days = hours / 24;
    if days >= 2 {
        format!("{} days ago", days)
    } else if days == 1 {
        "yesterday".to_string()
    } else if hours >= 1 {
        format!("{}h ago", hours)
    } else {
        format!("{}m ago", mins.max(1))
    }
}

/// Parse day-of-week (0=Monday) from an ISO date string "YYYY-MM-DD".
fn parse_day_of_week(date: &str) -> Option<usize> {
    use chrono::NaiveDate;
    use chrono::Datelike;
    NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .ok()
        .map(|d| d.weekday().num_days_from_monday() as usize)
}
