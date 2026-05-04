use std::sync::{Arc, Mutex};

#[derive(Debug, Default, Clone)]
pub struct SleepStateInner {
    pub sleeping: bool,
    pub privacy: bool,
    /// True when the current sleep was triggered by the auto-schedule, not manually.
    /// Prevents the schedule from auto-waking a session the user manually put to sleep.
    pub schedule_triggered: bool,
    pub schedule_enabled: bool,
    pub schedule_start_hour: u8,
    pub schedule_start_minute: u8,
    pub schedule_end_hour: u8,
    pub schedule_end_minute: u8,
}

impl SleepStateInner {
    pub fn is_paused(&self) -> bool {
        self.sleeping || self.privacy
    }
}

pub type SleepState = Arc<Mutex<SleepStateInner>>;

/// Returns true if (hour, minute) falls within the quiet-hour window.
/// Handles overnight ranges (e.g. 23:00–07:00).
pub fn in_schedule(
    start_h: u8, start_m: u8,
    end_h: u8,   end_m: u8,
    hour: u8,    minute: u8,
) -> bool {
    let now   = (hour    as u16) * 60 + minute  as u16;
    let start = (start_h as u16) * 60 + start_m as u16;
    let end   = (end_h   as u16) * 60 + end_m   as u16;
    if start <= end {
        now >= start && now < end
    } else {
        // Overnight window: e.g. 23:00–07:00
        now >= start || now < end
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn overnight_range() {
        assert!(in_schedule(23, 0, 7, 0, 0, 30));
        assert!(in_schedule(23, 0, 7, 0, 6, 59));
        assert!(!in_schedule(23, 0, 7, 0, 7, 0));
        assert!(!in_schedule(23, 0, 7, 0, 20, 0));
    }

    #[test]
    fn daytime_range() {
        assert!(in_schedule(9, 0, 17, 0, 12, 0));
        assert!(!in_schedule(9, 0, 17, 0, 8, 59));
        assert!(!in_schedule(9, 0, 17, 0, 17, 0));
    }

    #[test]
    fn is_paused_either_flag() {
        let mut s = SleepStateInner::default();
        assert!(!s.is_paused());
        s.sleeping = true;
        assert!(s.is_paused());
        s.sleeping = false;
        s.privacy = true;
        assert!(s.is_paused());
    }
}
