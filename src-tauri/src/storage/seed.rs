use crate::pipeline::aggregator::BehavioralSnapshot;
use crate::storage::{queries, DbPools};
use rand::{Rng, SeedableRng};

pub async fn seed_demo(pools: &DbPools) -> Result<String, String> {
    // Compute midnight of today in local time
    let today_midnight_ms = {
        use chrono::{Datelike, Local, TimeZone};
        let now = chrono::Local::now();
        Local
            .with_ymd_and_hms(now.year(), now.month(), now.day(), 0, 0, 0)
            .single()
            .map(|dt| dt.timestamp_millis())
            .unwrap_or_else(|| now.timestamp_millis())
    };

    let day_ms: i64 = 86_400_000;
    let mut rng = rand::rngs::StdRng::from_entropy();
    let apps = [
        "code.exe",
        "firefox.exe",
        "explorer.exe",
        "spotify.exe",
        "discord.exe",
    ];
    let states = ["focus", "calm", "deep", "spark", "burn", "fade", "rest"];
    let insight_types = ["flow_detection", "fatigue_signal", "break_signal", "anomaly"];
    let insight_texts = [
        "you've been in a steady typing rhythm for a while. that's a flow state.",
        "your mouse jitter just spiked — might be fatigue creeping in.",
        "you haven't moved in 40 minutes. maybe stretch?",
        "app-switching rate jumped 3x in the last window. context switching overhead.",
        "typing speed dropped but accuracy went up. deep thinking mode?",
        "your error rate doubled in the last 10 minutes. take a breath.",
        "longest focus block today: 47 minutes. not bad.",
        "you switched apps 22 times in the last hour. that's high for you.",
    ];
    let extended_texts = [
        "based on sustained typing speed above your personal baseline with low error rate and minimal app switching.",
        "mouse tremor variance increased 2.1 standard deviations above your afternoon baseline.",
        "no keyboard or mouse input detected for an extended period during an active session.",
        "app_switch_count z-score exceeded 2.0 for two consecutive windows. prior pattern suggests context fragmentation.",
        "typing_speed z-score is -0.8 but error_rate z-score is -1.2. inverse correlation suggests deliberate, careful work.",
        "error_rate z-score jumped to +1.8. this sometimes precedes a natural break in your pattern.",
        "measured from session start to the last continuous focus-state window before a state transition.",
        "compared against your 7-day rolling average of 9 switches/hour. current rate: 22/hour.",
    ];

    let mut total_snapshots = 0i64;
    let mut total_insights = 0i64;

    for day_offset in (0..7).rev() {
        let day_start = today_midnight_ms - (day_offset as i64 * day_ms);
        let date_str = chrono::DateTime::from_timestamp_millis(day_start)
            .map(|dt| {
                dt.with_timezone(&chrono::Local)
                    .format("%Y-%m-%d")
                    .to_string()
            })
            .unwrap_or_else(|| "unknown".to_string());

        // 2-3 sessions per day
        let session_count = rng.gen_range(2..=3);
        let mut day_focus = 0i64;
        let mut day_calm = 0i64;
        let mut day_deep = 0i64;
        let mut day_spark = 0i64;
        let mut day_burn = 0i64;
        let mut day_fade = 0i64;
        let mut day_rest = 0i64;
        let mut day_active = 0i64;
        let mut day_longest_focus = 0i64;

        for s in 0..session_count {
            let session_hour = match s {
                0 => rng.gen_range(9..12),
                1 => rng.gen_range(13..17),
                _ => rng.gen_range(19..22),
            };
            let session_start = day_start + (session_hour as i64 * 3_600_000);
            let session_duration_mins = rng.gen_range(30..120);
            let session_end = session_start + (session_duration_mins as i64 * 60_000);

            let sid = queries::start_session(pools.write.as_ref(), session_start)
                .await
                .map_err(|e| e.to_string())?;
            queries::end_session(pools.write.as_ref(), sid, session_end, "inactivity")
                .await
                .map_err(|e| e.to_string())?;

            // One snapshot per minute
            for min in 0..session_duration_mins {
                let ts = session_start + (min as i64 * 60_000);
                let snap = BehavioralSnapshot {
                    session_id: sid,
                    timestamp_ms: ts,
                    typing_speed: rng.gen_range(0.5..4.5),
                    error_rate: rng.gen_range(0.02..0.20),
                    pause_count: rng.gen_range(0..8),
                    mouse_speed: rng.gen_range(80.0..600.0),
                    mouse_jitter: rng.gen_range(2.0..25.0),
                    click_count: rng.gen_range(1..20),
                    scroll_count: rng.gen_range(0..15),
                    cpu_percent: rng.gen_range(10.0..85.0),
                    ram_percent: rng.gen_range(40.0..80.0),
                    battery_percent: rng.gen_range(20..100),
                    on_battery: rng.gen_bool(0.3),
                    window_count: rng.gen_range(3..15),
                    foreground_app: apps[rng.gen_range(0..apps.len())].to_string(),
                    app_switch_count: rng.gen_range(0..6),
                    single_window_hold_ms: rng.gen_range(5_000..60_000),
                    undo_count: rng.gen_range(0..3),
                    redo_count: rng.gen_range(0..2),
                    save_count: rng.gen_range(0..2),
                    avg_key_hold_ms: rng.gen_range(60..180),
                    right_click_count: rng.gen_range(0..3),
                    scroll_depth_y: rng.gen_range(0..2000),
                    display_brightness: rng.gen_range(30..100),
                    night_light_enabled: rng.gen_bool(0.2),
                };
                queries::insert_snapshot(pools.write.as_ref(), &snap)
                    .await
                    .map_err(|e| e.to_string())?;
                total_snapshots += 1;
            }

            let focus_mins = rng.gen_range(5..session_duration_mins / 2);
            let calm_mins = rng.gen_range(3..15).min(session_duration_mins - focus_mins);
            let deep_mins =
                rng.gen_range(0..10).min(session_duration_mins - focus_mins - calm_mins);
            let spark_mins = rng.gen_range(0..5);
            let burn_mins = rng.gen_range(0..4);
            let fade_mins = rng.gen_range(0..3);
            let rest_mins = rng.gen_range(0..3);
            day_focus += focus_mins as i64;
            day_calm += calm_mins as i64;
            day_deep += deep_mins as i64;
            day_spark += spark_mins as i64;
            day_burn += burn_mins as i64;
            day_fade += fade_mins as i64;
            day_rest += rest_mins as i64;
            day_active += session_duration_mins as i64;
            day_longest_focus = day_longest_focus.max(focus_mins as i64);

            // 1-3 insights per session
            let insight_count = rng.gen_range(1..=3);
            for _ in 0..insight_count {
                let it = rng.gen_range(0..insight_types.len());
                let ti = rng.gen_range(0..insight_texts.len());
                let ins_ts =
                    session_start + rng.gen_range(0..(session_duration_mins as i64 * 60_000));
                let st = states[rng.gen_range(0..states.len())];
                queries::insert_insight(
                    pools.write.as_ref(),
                    ins_ts,
                    Some(sid),
                    st,
                    insight_texts[ti],
                    extended_texts[ti.min(extended_texts.len() - 1)],
                    insight_types[it],
                )
                .await
                .map_err(|e| e.to_string())?;
                total_insights += 1;
            }
        }

        queries::upsert_daily_summary(
            pools.write.as_ref(),
            &date_str,
            day_active,
            day_focus,
            day_calm,
            day_deep,
            day_spark,
            day_burn,
            day_fade,
            day_rest,
            day_longest_focus,
            session_count as i64,
        )
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(format!(
        "Seeded 7 days: {} snapshots, {} insights",
        total_snapshots, total_insights
    ))
}
