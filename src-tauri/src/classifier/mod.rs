pub mod anomaly;
pub mod baseline;
pub mod daily_summary;
pub mod signals;
pub mod state_machine;

// ── State type ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WispState {
    Focus,
    Calm,
    Deep,
    Spark,
    Burn,
    Fade,
    Rest,
}

impl WispState {
    pub fn as_str(self) -> &'static str {
        match self {
            WispState::Focus => "focus",
            WispState::Calm  => "calm",
            WispState::Deep  => "deep",
            WispState::Spark => "spark",
            WispState::Burn  => "burn",
            WispState::Fade  => "fade",
            WispState::Rest  => "rest",
        }
    }
}

// ── Time helpers ──────────────────────────────────────────────────────────────

/// Returns (hour 0–23, day_of_week 0=Sunday..6=Saturday) in local time.
pub fn local_time_parts() -> (u32, u32) {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::SystemInformation::GetLocalTime;
        let st = unsafe { GetLocalTime() };
        (st.wHour as u32, st.wDayOfWeek as u32)
    }
    #[cfg(not(target_os = "windows"))]
    {
        use chrono::{Local, Datelike, Timelike};
        let now = Local::now();
        (now.hour(), now.weekday().num_days_from_sunday())
    }
}

/// Maps hour (0–23) to bucket: 0=night(0–5), 1=morning(6–11),
/// 2=afternoon(12–17), 3=evening(18–23).
pub fn time_of_day_bucket(hour: u32) -> i32 {
    match hour {
        0..=5   => 0,
        6..=11  => 1,
        12..=17 => 2,
        _       => 3,
    }
}

/// Returns today's date as "YYYY-MM-DD" in local time.
pub fn today_date_str() -> String {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::SystemInformation::GetLocalTime;
        let st = unsafe { GetLocalTime() };
        format!("{:04}-{:02}-{:02}", st.wYear, st.wMonth, st.wDay)
    }
    #[cfg(not(target_os = "windows"))]
    {
        use chrono::Local;
        Local::now().format("%Y-%m-%d").to_string()
    }
}

/// True if fewer than 30 days have elapsed since the first ever session.
pub fn is_cold_start(first_session_ms: Option<i64>) -> bool {
    let Some(first_ms) = first_session_ms else { return true; };
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;
    (now_ms - first_ms) / 86_400_000 < 30
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn time_of_day_bucket_boundaries() {
        assert_eq!(time_of_day_bucket(0),  0);
        assert_eq!(time_of_day_bucket(5),  0);
        assert_eq!(time_of_day_bucket(6),  1);
        assert_eq!(time_of_day_bucket(11), 1);
        assert_eq!(time_of_day_bucket(12), 2);
        assert_eq!(time_of_day_bucket(17), 2);
        assert_eq!(time_of_day_bucket(18), 3);
        assert_eq!(time_of_day_bucket(23), 3);
    }

    #[test]
    fn is_cold_start_true_when_no_sessions() {
        assert!(is_cold_start(None));
    }

    #[test]
    fn is_cold_start_true_within_30_days() {
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;
        assert!(is_cold_start(Some(now_ms - 10 * 86_400_000)));
    }

    #[test]
    fn is_cold_start_false_after_30_days() {
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;
        assert!(!is_cold_start(Some(now_ms - 31 * 86_400_000)));
    }

    #[test]
    fn wisp_state_as_str() {
        assert_eq!(WispState::Focus.as_str(), "focus");
        assert_eq!(WispState::Burn.as_str(),  "burn");
        assert_eq!(WispState::Rest.as_str(),  "rest");
    }
}
