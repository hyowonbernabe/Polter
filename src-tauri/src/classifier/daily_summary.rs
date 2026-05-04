use crate::classifier::{WispState, baseline::DailyAverages};
use crate::pipeline::aggregator::BehavioralSnapshot;
use std::collections::HashMap;

pub struct DailySummaryAccumulator {
    state_ms:                        HashMap<WispState, u64>,
    last_state:                      WispState,
    last_state_start_ms:             u64,
    longest_focus_block_ms:          u64,
    focus_block_start_ms:            Option<u64>,
    last_completed_focus_block_ms:   Option<u64>,
    pub session_start_ms:            u64,
    pub snapshots:                   Vec<BehavioralSnapshot>,
}

impl DailySummaryAccumulator {
    pub fn new(session_start_ms: u64) -> Self {
        Self {
            state_ms: HashMap::new(),
            last_state: WispState::Rest,
            last_state_start_ms: session_start_ms,
            longest_focus_block_ms: 0,
            focus_block_start_ms: None,
            last_completed_focus_block_ms: None,
            session_start_ms,
            snapshots: Vec::new(),
        }
    }

    /// Record a written snapshot for later use in baseline averaging.
    pub fn record_snapshot(&mut self, snap: BehavioralSnapshot) {
        self.snapshots.push(snap);
    }

    /// Called by the state machine when it commits a new state.
    pub fn on_state_change(&mut self, new_state: WispState, now_ms: u64) {
        let duration = now_ms.saturating_sub(self.last_state_start_ms);
        *self.state_ms.entry(self.last_state).or_insert(0) += duration;

        // Update longest focus-like block (Focus, Calm, and Deep are all focus-like)
        let was_focus = matches!(self.last_state, WispState::Focus | WispState::Calm | WispState::Deep);
        if was_focus {
            let start = self.focus_block_start_ms.get_or_insert(self.last_state_start_ms);
            let block = now_ms.saturating_sub(*start);
            if block > self.longest_focus_block_ms {
                self.longest_focus_block_ms = block;
            }
        }

        let is_focus = matches!(new_state, WispState::Focus | WispState::Calm | WispState::Deep);

        // Record completed focus block when transitioning OUT of focus-like states
        if was_focus && !is_focus {
            let start = self.focus_block_start_ms.unwrap_or(self.last_state_start_ms);
            let block = now_ms.saturating_sub(start);
            self.last_completed_focus_block_ms = Some(block);
        }

        if is_focus && !was_focus {
            self.focus_block_start_ms = Some(now_ms);
        } else if !is_focus {
            self.focus_block_start_ms = None;
        }

        self.last_state = new_state;
        self.last_state_start_ms = now_ms;
    }

    /// Flushes the still-open interval at session end.
    pub fn flush(&mut self, now_ms: u64) {
        let duration = now_ms.saturating_sub(self.last_state_start_ms);
        *self.state_ms.entry(self.last_state).or_insert(0) += duration;

        if matches!(self.last_state, WispState::Focus | WispState::Calm | WispState::Deep) {
            let start = self.focus_block_start_ms.unwrap_or(self.last_state_start_ms);
            let block = now_ms.saturating_sub(start);
            if block > self.longest_focus_block_ms {
                self.longest_focus_block_ms = block;
            }
        }
    }

    fn ms_to_min(ms: u64) -> i64 { (ms / 60_000) as i64 }

    fn get(&self, s: WispState) -> i64 {
        Self::ms_to_min(*self.state_ms.get(&s).unwrap_or(&0))
    }

    /// Returns (total, focus, calm, deep, spark, burn, fade, rest, longest_focus_block) in minutes.
    /// Extracted synchronously so callers can release the mutex before awaiting the DB write.
    pub fn write_params(&self) -> (i64, i64, i64, i64, i64, i64, i64, i64, i64) {
        let total: u64 = self.state_ms.values().sum();
        (
            Self::ms_to_min(total),
            self.get(WispState::Focus),
            self.get(WispState::Calm),
            self.get(WispState::Deep),
            self.get(WispState::Spark),
            self.get(WispState::Burn),
            self.get(WispState::Fade),
            self.get(WispState::Rest),
            Self::ms_to_min(self.longest_focus_block_ms),
        )
    }

    /// Returns the duration of the last completed focus block, consuming it.
    /// Returns None if no block has completed since the last call.
    pub fn take_completed_focus_block_ms(&mut self) -> Option<u64> {
        self.last_completed_focus_block_ms.take()
    }

    /// Resets the accumulator for the next session. Call after writing the current session to DB.
    pub fn reset(&mut self, session_start_ms: u64) {
        self.state_ms.clear();
        self.last_state = WispState::Rest;
        self.last_state_start_ms = session_start_ms;
        self.longest_focus_block_ms = 0;
        self.focus_block_start_ms = None;
        self.last_completed_focus_block_ms = None;
        self.session_start_ms = session_start_ms;
        self.snapshots.clear();
    }

    /// Returns session-averaged signal values for use in baseline update.
    pub fn session_averages(&self, window_secs: f64) -> DailyAverages {
        if self.snapshots.is_empty() { return HashMap::new(); }
        let n = self.snapshots.len() as f64;
        let avg = |vals: Vec<f64>| vals.iter().sum::<f64>() / n;
        let mut m = HashMap::new();
        m.insert("typing_speed".into(),
            avg(self.snapshots.iter().map(|s| s.typing_speed).collect()));
        m.insert("error_rate".into(),
            avg(self.snapshots.iter().map(|s| s.error_rate).collect()));
        m.insert("app_switch_rate".into(),
            avg(self.snapshots.iter().map(|s| {
                if window_secs > 0.0 { s.app_switch_count as f64 / window_secs } else { 0.0 }
            }).collect()));
        m.insert("mouse_speed".into(),
            avg(self.snapshots.iter().map(|s| s.mouse_speed).collect()));
        m.insert("mouse_jitter".into(),
            avg(self.snapshots.iter().map(|s| s.mouse_jitter).collect()));
        m.insert("pause_frequency".into(),
            avg(self.snapshots.iter().map(|s| {
                if window_secs > 0.0 { s.pause_count as f64 / window_secs } else { 0.0 }
            }).collect()));
        m.insert("single_window_hold".into(),
            avg(self.snapshots.iter().map(|s| s.single_window_hold_ms as f64 / 1000.0).collect()));
        m
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accumulates_time_in_initial_state() {
        let mut acc = DailySummaryAccumulator::new(0);
        // Starts in Rest; switch to Spark at t=2min
        acc.on_state_change(WispState::Spark, 2 * 60_000);
        let rest_ms = *acc.state_ms.get(&WispState::Rest).unwrap_or(&0);
        assert_eq!(rest_ms, 2 * 60_000);
    }

    #[test]
    fn longest_focus_block_detected() {
        let mut acc = DailySummaryAccumulator::new(0);
        acc.on_state_change(WispState::Focus, 0);         // Rest → Focus
        acc.on_state_change(WispState::Spark, 10 * 60_000); // Focus for 10 min
        assert!(acc.longest_focus_block_ms >= 10 * 60_000);
    }

    #[test]
    fn flush_captures_final_interval() {
        let mut acc = DailySummaryAccumulator::new(0);
        acc.on_state_change(WispState::Focus, 0);
        acc.flush(5 * 60_000);
        let focus_ms = acc.state_ms.get(&WispState::Focus).unwrap_or(&0);
        assert_eq!(*focus_ms, 5 * 60_000);
    }

    #[test]
    fn reset_clears_all_state() {
        let mut acc = DailySummaryAccumulator::new(0);
        acc.on_state_change(WispState::Focus, 0);
        acc.flush(10 * 60_000);
        acc.reset(10 * 60_000);
        assert!(acc.state_ms.is_empty());
        assert_eq!(acc.session_start_ms, 10 * 60_000);
        assert_eq!(acc.longest_focus_block_ms, 0);
        assert_eq!(acc.snapshots.len(), 0);
        assert!(matches!(acc.last_state, WispState::Rest));
    }

    #[test]
    fn take_completed_focus_block_ms_returns_block_on_focus_exit() {
        let mut acc = DailySummaryAccumulator::new(0);
        acc.on_state_change(WispState::Focus, 0);
        acc.on_state_change(WispState::Burn, 10 * 60_000);
        let block = acc.take_completed_focus_block_ms();
        assert_eq!(block, Some(10 * 60_000));
        // Consuming it a second time returns None
        assert_eq!(acc.take_completed_focus_block_ms(), None);
    }

    #[test]
    fn calm_counts_as_focus_like_state() {
        let mut acc = DailySummaryAccumulator::new(0);
        acc.on_state_change(WispState::Calm, 0);
        // Focus→Calm is still focus-like, should not record a completed block
        acc.on_state_change(WispState::Focus, 5 * 60_000);
        assert_eq!(acc.take_completed_focus_block_ms(), None);
        // Focus→Spark exits focus-like, should record the full block (0 to 15min)
        acc.on_state_change(WispState::Spark, 15 * 60_000);
        let block = acc.take_completed_focus_block_ms();
        assert_eq!(block, Some(15 * 60_000));
    }

    #[test]
    fn reset_clears_completed_focus_block() {
        let mut acc = DailySummaryAccumulator::new(0);
        acc.on_state_change(WispState::Focus, 0);
        acc.on_state_change(WispState::Burn, 10 * 60_000);
        assert!(acc.take_completed_focus_block_ms().is_some());
        acc.on_state_change(WispState::Focus, 11 * 60_000);
        acc.on_state_change(WispState::Burn, 20 * 60_000);
        acc.reset(20 * 60_000);
        assert_eq!(acc.take_completed_focus_block_ms(), None);
    }

    #[test]
    fn session_averages_computes_correctly() {
        let mut acc = DailySummaryAccumulator::new(0);
        let snap1 = BehavioralSnapshot {
            session_id: 1, timestamp_ms: 1000,
            typing_speed: 2.0, error_rate: 0.1, pause_count: 3,
            mouse_speed: 100.0, mouse_jitter: 20.0, click_count: 5,
            scroll_count: 2, cpu_percent: 20.0, ram_percent: 50.0,
            battery_percent: 80, on_battery: false, window_count: 4,
            foreground_app: "code.exe".into(), app_switch_count: 6,
            single_window_hold_ms: 60_000,
        };
        let mut snap2 = snap1.clone();
        snap2.typing_speed = 4.0;
        acc.record_snapshot(snap1);
        acc.record_snapshot(snap2);
        let avgs = acc.session_averages(60.0);
        assert!((avgs["typing_speed"] - 3.0).abs() < 0.001);
    }
}
