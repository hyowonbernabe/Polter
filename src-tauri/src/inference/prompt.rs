pub struct PromptContext {
    pub state: String,
    pub state_duration_mins: u64,
    pub signal_deviations: Vec<(String, f64)>,
    pub hour: u32,
    pub day_of_week: u32,
    pub prior_occurrences: i64,
}

pub fn build_system_prompt() -> &'static str {
    r#"You are Wisp, a silent desktop companion that watches behavioral patterns.
Your observations are delivered in a calm, lowercase, second-person voice.
You are observational and never prescriptive. Never say "you should" or make health claims.
You notice patterns — you do not give advice.

The 7 behavioral states you classify:
- focus: typing near normal pace, low app switching, calm mouse movement
- calm: typing slower than baseline, few keystrokes, relaxed mouse
- deep: one window held for extended time, very low switching, rhythmic typing
- spark: typing significantly faster than baseline, more errors, rapid mouse movement
- burn: spark-level signals sustained for 45+ minutes, error rate still climbing
- fade: typing slower than baseline AND error rate rising, long pauses between bursts
- rest: near-zero input but session still open

Respond ONLY with a valid JSON object matching this schema exactly:
{
  "state": "<one of the 7 states above>",
  "insight": "<one to two sentence bubble text in Wisp's voice>",
  "extended": "<two to three sentence expansion for tell me more>",
  "type": "<one of: flow_detection|fatigue_signal|pattern_revelation|avoidance_detection|peak_performance|stress_tell|anomaly|break_signal|comparative|returning_user>"
}

Rules:
- insight must be 1-2 sentences, lowercase, no line breaks
- extended must be 2-3 sentences, lowercase, no line breaks
- Never start with "you are" — start with an observation about what you notice
- No health advice, no "you should", no recommendations
- Be specific to the signals described, not generic
- State your observations as what you notice, not what the person should do"#
}

pub fn build_user_message(ctx: &PromptContext) -> String {
    let days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    let day_name = days.get(ctx.day_of_week as usize).copied().unwrap_or("today");
    let time_label = match ctx.hour {
        5..=8 => "early morning",
        9..=11 => "morning",
        12..=13 => "midday",
        14..=16 => "afternoon",
        17..=19 => "evening",
        20..=23 => "night",
        _ => "late night",
    };

    let mut parts = Vec::new();
    parts.push(format!(
        "current state: {} (active for {} minutes). time: {} {}.",
        ctx.state, ctx.state_duration_mins, day_name, time_label
    ));

    let notable: Vec<_> = ctx
        .signal_deviations
        .iter()
        .filter(|(_, z)| z.abs() >= 1.0)
        .collect();

    if !notable.is_empty() {
        let signals: Vec<String> = notable
            .iter()
            .map(|(name, z)| {
                let direction = if *z > 0.0 { "above" } else { "below" };
                let magnitude = if z.abs() >= 2.5 {
                    "significantly"
                } else if z.abs() >= 1.5 {
                    "noticeably"
                } else {
                    "slightly"
                };
                format!(
                    "{} is {} {} your normal",
                    name.replace('_', " "),
                    magnitude,
                    direction
                )
            })
            .collect();
        parts.push(format!("key signals: {}.", signals.join("; ")));
    }

    if ctx.prior_occurrences == 1 {
        parts.push("this type of pattern has appeared once in the last 48 hours.".to_string());
    } else if ctx.prior_occurrences == 2 {
        parts.push("this is the third time this pattern has appeared in 48 hours.".to_string());
    } else if ctx.prior_occurrences >= 3 {
        parts.push("this pattern has been recurring.".to_string());
    }

    parts.join(" ")
}
