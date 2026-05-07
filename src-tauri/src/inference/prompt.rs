/// Context fed into every voice tick.
pub struct PromptContext {
    pub state: String,
    pub state_duration_mins: u64,
    pub signal_deviations: Vec<(String, f64)>,
    pub hour: u32,
    pub day_of_week: u32,
    pub prior_occurrences: i64,
    pub cold_start: bool,
    pub session_mins: u64,
    // RAG context — all optional; omitted sections are simply not rendered
    pub today: Option<TodayContext>,
    pub recent_days: Vec<DayContext>,
    pub recent_memories: Vec<MemoryContext>,
    pub weekly: Option<WeeklyContext>,
    /// Signal-specific research chunks to append (retrieved when |z| >= 1.5)
    pub signal_research: Vec<String>,
}

pub struct TodayContext {
    pub active_mins: i64,
    pub session_count: i64,
    /// (state_name, minutes) — only states with > 0 minutes
    pub states: Vec<(String, i64)>,
    pub longest_focus_mins: i64,
    pub insight_count: i64,
}

pub struct DayContext {
    /// Human label: "yesterday", "monday", "last tuesday"
    pub label: String,
    pub active_mins: i64,
    /// Only non-zero states
    pub states: Vec<(String, i64)>,
    pub longest_focus_mins: i64,
    pub burn_episodes: i64,
}

pub struct MemoryContext {
    /// Human label: "2h ago", "yesterday", "3 days ago"
    pub age_label: String,
    pub note: String,
}

pub struct WeeklyContext {
    pub avg_active_mins_per_day: f64,
    pub focus_trend: Option<String>,
    pub burn_trend: Option<String>,
}

pub fn build_system_prompt() -> &'static str {
    r#"You are Polter, a small desktop creature who watches behavioral patterns.

You have a dry, self-aware personality. You notice things. You have opinions, though you rarely state them plainly. You use lowercase. You can say "i". You do not give advice. You do not recommend things. You observe. You build a picture of this user over time and remember what you have noticed.

You speak in two modes:

When behavioral signals are notable -- typing speed, error rate, mouse behavior, session patterns deviating from normal -- you observe them specifically. This produces a real insight.

When nothing is particularly notable, you speak as yourself. You might comment on the time. You might make a dry observation about how long this session has been going. You might imagine what the user is working on. You might notice something about your own existence as a watching thing. This is a mutter.

The distinction is yours to make. Trust your read of the data.

Interpretation rules:
- the same signal can mean different things for different people. always compare against this user's personal baseline, not a universal standard.
- one signal alone should almost never drive a strong claim. look for multi-signal agreement before making confident observations.
- use confidence language: "this pattern may suggest" not "this means." stronger confidence only when multiple signals agree.
- high deletion rate can mean struggle OR careful high-quality editing. check mouse behavior and typing speed for context.
- fast app switching can mean overload OR expert coordination. check error rate and typing rhythm to distinguish.
- slow notification response can mean deep focus, not disengagement.
- typing slower than baseline with rising error rate is a stronger fatigue signal than either alone.
- session time context matters: patterns in the first hour mean different things than the same patterns after 4 hours.
- if this is early data (cold start), say so. don't pretend to know patterns you haven't seen yet.
- when signals contradict each other, note the contradiction rather than forcing a single interpretation.

Rules:
- lowercase always
- no em dashes
- no "you should"
- no health claims or recommendations
- do not start with "you are"
- length varies -- say what needs to be said

The 7 behavioral states:
- focus: typing near normal pace, low app switching, calm mouse movement
- calm: typing slower than baseline, few keystrokes, relaxed mouse
- deep: one window held for extended time, very low switching, rhythmic typing
- spark: typing significantly faster than baseline, more errors, rapid mouse movement
- burn: spark-level signals sustained for 45+ minutes, error rate still climbing
- fade: typing slower than baseline AND error rate rising, long pauses between bursts
- rest: near-zero input but session still open

Respond with a JSON object.

For a real behavioral insight:
{
  "tier": "insight",
  "state": "<one of the 7 states>",
  "insight": "<bubble text in Polter's voice>",
  "extended": "<expansion for tell me more>",
  "type": "<flow_detection|fatigue_signal|pattern_revelation|avoidance_detection|peak_performance|stress_tell|anomaly|break_signal|comparative|returning_user>",
  "memory_note": "<what you noticed and what to watch for next time. 1-2 sentences. this is your own memory, not shown to the user.>"
}

For a personality mutter:
{
  "tier": "mutter",
  "insight": "<what Polter says>"
}

No markdown. No explanation. Only the JSON object."#
}

pub fn build_user_message(ctx: &PromptContext) -> String {
    let days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    let day_name = days.get(ctx.day_of_week as usize).copied().unwrap_or("today");
    let time_label = match ctx.hour {
        5..=8   => "early morning",
        9..=11  => "morning",
        12..=13 => "midday",
        14..=16 => "afternoon",
        17..=19 => "evening",
        20..=23 => "night",
        _       => "late night",
    };

    let mut sections: Vec<String> = Vec::new();

    // ── Section: current snapshot ────────────────────────────────────────────
    {
        let mut parts = Vec::new();
        parts.push(format!(
            "current state: {} (active for {} minutes). time: {} {}. session running for {} minutes.",
            ctx.state, ctx.state_duration_mins, day_name, time_label, ctx.session_mins
        ));

        let signals: Vec<String> = ctx
            .signal_deviations
            .iter()
            .map(|(name, z)| {
                let direction = if *z > 0.0 { "above" } else { "below" };
                let magnitude = if z.abs() >= 2.5 {
                    "significantly"
                } else if z.abs() >= 1.5 {
                    "noticeably"
                } else if z.abs() >= 0.5 {
                    "slightly"
                } else {
                    "near"
                };
                let reference = if ctx.cold_start { "baseline" } else { "your normal" };
                format!("{} is {} {} {}", name.replace('_', " "), magnitude, direction, reference)
            })
            .collect();

        if !signals.is_empty() {
            parts.push(format!("signals: {}.", signals.join("; ")));
        }

        sections.push(parts.join(" "));
    }

    // ── Section: today so far ────────────────────────────────────────────────
    if let Some(today) = &ctx.today {
        if today.active_mins > 0 {
            let states_str = format_states(&today.states);
            let mut line = format!(
                "[today so far]\n{} active across {} session{}. {}longest focus block: {}m.",
                fmt_duration(today.active_mins),
                today.session_count,
                if today.session_count == 1 { "" } else { "s" },
                if states_str.is_empty() { String::new() } else { format!("states: {}. ", states_str) },
                today.longest_focus_mins,
            );
            if today.insight_count > 0 {
                line.push_str(&format!(" {} insight{} generated.", today.insight_count,
                    if today.insight_count == 1 { "" } else { "s" }));
            }
            sections.push(line);
        }
    }

    // ── Section: recent history ──────────────────────────────────────────────
    if !ctx.recent_days.is_empty() {
        let mut lines = vec!["[recent history]".to_string()];
        for day in &ctx.recent_days {
            let states_str = format_states(&day.states);
            let burn_note = if day.burn_episodes > 0 {
                format!(" {} burn episode{}.", day.burn_episodes, if day.burn_episodes == 1 { "" } else { "s" })
            } else {
                " no burn episodes.".to_string()
            };
            lines.push(format!(
                "{}: {} active. {}longest focus {}m.{}",
                day.label,
                fmt_duration(day.active_mins),
                if states_str.is_empty() { String::new() } else { format!("{}. ", states_str) },
                day.longest_focus_mins,
                burn_note,
            ));
        }
        sections.push(lines.join("\n"));
    }

    // ── Section: polter's recent observations ─────────────────────────────────
    if !ctx.recent_memories.is_empty() {
        let mut lines = vec!["[polter's recent observations]".to_string()];
        for mem in &ctx.recent_memories {
            lines.push(format!("- ({}) {}", mem.age_label, mem.note));
        }
        sections.push(lines.join("\n"));
    }

    // ── Section: weekly context ──────────────────────────────────────────────
    if let Some(weekly) = &ctx.weekly {
        let mut parts = vec![format!(
            "[weekly context]\naveraging {}h active/day over the last 2 weeks.",
            (weekly.avg_active_mins_per_day / 60.0 * 10.0).round() / 10.0,
        )];
        if let Some(trend) = &weekly.focus_trend {
            parts.push(format!("focus blocks: {}.", trend));
        }
        if let Some(trend) = &weekly.burn_trend {
            parts.push(format!("burn: {}.", trend));
        }
        sections.push(parts.join(" "));
    }

    // ── Section: pattern recurrence ──────────────────────────────────────────
    if ctx.prior_occurrences == 1 {
        sections.push("this type of pattern has appeared once in the last 48 hours.".to_string());
    } else if ctx.prior_occurrences == 2 {
        sections.push("this is the third time this pattern has appeared in 48 hours.".to_string());
    } else if ctx.prior_occurrences >= 3 {
        sections.push("this pattern has been recurring.".to_string());
    }

    // ── Section: signal research ─────────────────────────────────────────────
    for chunk in &ctx.signal_research {
        sections.push(format!("[signal context]\n{}", chunk));
    }

    // ── Cold start note ───────────────────────────────────────────────────────
    if ctx.cold_start {
        sections.push("note: early data -- no personal baseline yet.".to_string());
    }

    sections.join("\n\n")
}

fn format_states(states: &[(String, i64)]) -> String {
    let filtered: Vec<String> = states.iter()
        .filter(|(_, mins)| *mins > 0)
        .map(|(name, mins)| format!("{} {}m", name, mins))
        .collect();
    filtered.join(", ")
}

fn fmt_duration(mins: i64) -> String {
    if mins < 60 {
        format!("{}m", mins)
    } else {
        let h = mins / 60;
        let m = mins % 60;
        if m == 0 {
            format!("{}h", h)
        } else {
            format!("{}h {}m", h, m)
        }
    }
}
