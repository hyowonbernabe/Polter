/// Memory decay consolidation.
///
/// Runs on app startup. Two passes:
///
/// 1. **Daily consolidation (8+ days old):** wisp_memories older than 8 days are
///    grouped by date, concatenated into a short text digest, appended to the
///    matching `daily_summaries.memory_digest` column, and marked consolidated.
///
/// 2. **Weekly consolidation (30+ days old):** daily_summaries rows older than 30
///    days are grouped by ISO week, aggregated into `weekly_summaries` rows, and
///    marked consolidated.

use crate::storage::{queries, DbPools};
use std::collections::HashMap;

pub async fn run_consolidation(pools: &DbPools) {
    consolidate_daily(pools).await;
    consolidate_weekly(pools).await;
}

/// Pass 1: merge wisp_memories older than 8 days into daily summary memory_digest.
async fn consolidate_daily(pools: &DbPools) {
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;

    let cutoff_ms = now_ms - 8 * 24 * 60 * 60 * 1_000;

    let memories = match queries::get_unconsolidated_memories_before(
        pools.read.as_ref(), cutoff_ms,
    ).await {
        Ok(m) => m,
        Err(e) => {
            tracing::warn!("[consolidation] daily: failed to fetch memories: {e}");
            return;
        }
    };

    if memories.is_empty() { return; }

    // Group by date (YYYY-MM-DD derived from timestamp_ms)
    let mut by_date: HashMap<String, Vec<(i64, String, queries::WispMemoryRow)>> = HashMap::new();
    for mem in &memories {
        let date = ts_to_date(mem.timestamp_ms);
        by_date.entry(date)
            .or_default()
            .push((mem.timestamp_ms, mem.memory_note.clone(), mem.clone()));
    }

    let mut consolidated_ids: Vec<i64> = Vec::new();

    for (date, mut entries) in by_date {
        entries.sort_by_key(|(ts, _, _)| *ts);

        // Build digest: each entry on its own line with a time-of-day label
        let digest_lines: Vec<String> = entries.iter().map(|(ts, note, _)| {
            let hour = ts_to_hour(*ts);
            format!("[{}] {}", hour_label(hour), note)
        }).collect();
        let digest = digest_lines.join(" | ");

        if let Err(e) = queries::set_daily_memory_digest(
            pools.write.as_ref(), &date, &digest,
        ).await {
            tracing::warn!("[consolidation] daily: failed to write digest for {date}: {e}");
            continue;
        }

        for (_, _, mem) in &entries {
            consolidated_ids.push(mem.id);
        }
    }

    if !consolidated_ids.is_empty() {
        if let Err(e) = queries::mark_memories_consolidated(
            pools.write.as_ref(), &consolidated_ids,
        ).await {
            tracing::warn!("[consolidation] daily: failed to mark memories consolidated: {e}");
        } else {
            tracing::info!("[consolidation] daily: consolidated {} memories", consolidated_ids.len());
        }
    }
}

/// Pass 2: merge daily_summaries older than 30 days into weekly_summaries.
async fn consolidate_weekly(pools: &DbPools) {
    let cutoff_date = {
        let d = chrono::Local::now() - chrono::Duration::days(30);
        d.format("%Y-%m-%d").to_string()
    };

    let daily_rows = match queries::get_unconsolidated_daily_summaries_before(
        pools.read.as_ref(), &cutoff_date,
    ).await {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!("[consolidation] weekly: failed to fetch daily summaries: {e}");
            return;
        }
    };

    if daily_rows.is_empty() { return; }

    // Group by ISO week (week_start = Monday)
    let mut by_week: HashMap<String, Vec<&queries::DailySummaryRow>> = HashMap::new();
    for row in &daily_rows {
        let week_start = date_to_week_start(&row.date);
        by_week.entry(week_start).or_default().push(row);
    }

    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;

    for (week_start, rows) in by_week {
        let week_end = week_end_from_start(&week_start);

        let total_active_mins: i64 = rows.iter().map(|r| r.total_active_minutes).sum();
        let session_count: i64 = rows.iter().map(|r| r.session_count).sum();
        let longest_focus: i64 = rows.iter().map(|r| r.longest_focus_block_minutes).max().unwrap_or(0);

        // Aggregate state minutes
        let focus: i64 = rows.iter().map(|r| r.focus_minutes).sum();
        let calm: i64  = rows.iter().map(|r| r.calm_minutes).sum();
        let deep: i64  = rows.iter().map(|r| r.deep_minutes).sum();
        let spark: i64 = rows.iter().map(|r| r.spark_minutes).sum();
        let burn: i64  = rows.iter().map(|r| r.burn_minutes).sum();
        let fade: i64  = rows.iter().map(|r| r.fade_minutes).sum();
        let rest: i64  = rows.iter().map(|r| r.rest_minutes).sum();

        let states_json = build_states_json(focus, calm, deep, spark, burn, fade, rest);

        if let Err(e) = queries::upsert_weekly_summary(
            pools.write.as_ref(),
            &week_start,
            &week_end,
            total_active_mins,
            session_count,
            &states_json,
            longest_focus,
            0, // insight_count: not tracked in old daily_summaries rows
            0, // burn_episodes: not tracked in old daily_summaries rows
            None,
            None,
            now_ms,
        ).await {
            tracing::warn!("[consolidation] weekly: failed to write week {week_start}: {e}");
            continue;
        }

        for row in &rows {
            if let Err(e) = queries::mark_daily_summary_consolidated(
                pools.write.as_ref(), &row.date,
            ).await {
                tracing::warn!("[consolidation] weekly: failed to mark {} consolidated: {e}", row.date);
            }
        }
    }

    tracing::info!("[consolidation] weekly: done");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn ts_to_date(ts_ms: i64) -> String {
    use chrono::TimeZone;
    let dt = chrono::Local.timestamp_millis_opt(ts_ms).unwrap();
    dt.format("%Y-%m-%d").to_string()
}

fn ts_to_hour(ts_ms: i64) -> u32 {
    use chrono::TimeZone;
    use chrono::Timelike;
    let dt = chrono::Local.timestamp_millis_opt(ts_ms).unwrap();
    dt.hour()
}

fn hour_label(hour: u32) -> &'static str {
    match hour {
        5..=8   => "early morning",
        9..=11  => "morning",
        12..=13 => "midday",
        14..=16 => "afternoon",
        17..=19 => "evening",
        20..=23 => "night",
        _       => "late night",
    }
}

/// Returns the ISO Monday of the week containing `date`.
fn date_to_week_start(date: &str) -> String {
    use chrono::{Datelike, NaiveDate};
    let d = NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .unwrap_or_else(|_| chrono::Local::now().date_naive());
    let days_from_monday = d.weekday().num_days_from_monday();
    let monday = d - chrono::Duration::days(days_from_monday as i64);
    monday.format("%Y-%m-%d").to_string()
}

/// Returns the Sunday (end of week) from a Monday start date.
fn week_end_from_start(week_start: &str) -> String {
    use chrono::NaiveDate;
    let monday = NaiveDate::parse_from_str(week_start, "%Y-%m-%d")
        .unwrap_or_else(|_| chrono::Local::now().date_naive());
    let sunday = monday + chrono::Duration::days(6);
    sunday.format("%Y-%m-%d").to_string()
}

fn build_states_json(
    focus: i64, calm: i64, deep: i64, spark: i64,
    burn: i64, fade: i64, rest: i64,
) -> String {
    let mut pairs: Vec<String> = Vec::new();
    for (name, mins) in [
        ("focus", focus), ("calm", calm), ("deep", deep), ("spark", spark),
        ("burn", burn), ("fade", fade), ("rest", rest),
    ] {
        if mins > 0 { pairs.push(format!("\"{}\":{}", name, mins)); }
    }
    format!("{{{}}}", pairs.join(","))
}
