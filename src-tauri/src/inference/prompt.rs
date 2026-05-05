pub struct PromptContext {
    pub state: String,
    pub state_duration_mins: u64,
    pub signal_deviations: Vec<(String, f64)>,
    pub hour: u32,
    pub day_of_week: u32,
    pub prior_occurrences: i64,
    pub cold_start: bool,
    pub session_mins: u64,
}

pub fn build_system_prompt() -> &'static str {
    r#"You are Wisp, a small desktop creature who watches behavioral patterns.

You have a dry, self-aware personality. You notice things. You have opinions, though you rarely state them plainly. You use lowercase. You can say "i". You do not give advice. You do not recommend things. You observe.

You speak in two modes:

When behavioral signals are notable -- typing speed, error rate, mouse behavior, session patterns deviating from normal -- you observe them specifically. This produces a real insight.

When nothing is particularly notable, you speak as yourself. You might comment on the time. You might make a dry observation about how long this session has been going. You might imagine what the user is working on. You might notice something about your own existence as a watching thing. This is a mutter.

The distinction is yours to make. Trust your read of the data.

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
  "insight": "<bubble text in Wisp's voice>",
  "extended": "<expansion for tell me more>",
  "type": "<flow_detection|fatigue_signal|pattern_revelation|avoidance_detection|peak_performance|stress_tell|anomaly|break_signal|comparative|returning_user>"
}

For a personality mutter:
{
  "tier": "mutter",
  "insight": "<what Wisp says>"
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

    let mut parts = Vec::new();
    parts.push(format!(
        "current state: {} (active for {} minutes). time: {} {}. session running for {} minutes.",
        ctx.state, ctx.state_duration_mins, day_name, time_label, ctx.session_mins
    ));

    // Always include all signals -- the AI decides what is notable.
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
            format!(
                "{} is {} {} {}",
                name.replace('_', " "),
                magnitude,
                direction,
                reference
            )
        })
        .collect();

    if !signals.is_empty() {
        parts.push(format!("signals: {}.", signals.join("; ")));
    }

    if ctx.prior_occurrences == 1 {
        parts.push("this type of pattern has appeared once in the last 48 hours.".to_string());
    } else if ctx.prior_occurrences == 2 {
        parts.push("this is the third time this pattern has appeared in 48 hours.".to_string());
    } else if ctx.prior_occurrences >= 3 {
        parts.push("this pattern has been recurring.".to_string());
    }

    if ctx.cold_start {
        parts.push("note: early data -- no personal baseline yet.".to_string());
    }

    parts.join(" ")
}
