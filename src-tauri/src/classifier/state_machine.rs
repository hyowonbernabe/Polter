use crate::classifier::{WispState, signals::SignalZScores};

// ── Pure classification ───────────────────────────────────────────────────────

/// Classifies the current behavioral state from z-scores.
/// `spark_duration_secs`: continuous seconds the user has been at spark-level activity.
pub fn classify_state(z: &SignalZScores, spark_duration_secs: u64) -> WispState {
    // Rest: near-zero absolute input (not relative — user is genuinely idle)
    if z.typing_speed_raw < 0.1 && z.mouse_speed < -0.5 {
        return WispState::Rest;
    }
    // Burn: spark-level sustained ≥ 45 minutes
    if spark_duration_secs >= 45 * 60 && (z.typing_speed > 1.0 || z.error_rate > 1.0) {
        return WispState::Burn;
    }
    // Spark: significantly faster than normal, possibly with more errors
    if z.typing_speed > 1.5 || (z.typing_speed > 1.0 && z.error_rate > 1.0) {
        return WispState::Spark;
    }
    // Deep: one window held for very long time, zero app switching, moderate typing
    if z.single_window_hold > 2.0 && z.app_switch_rate < -1.0 && z.typing_speed.abs() < 1.5 {
        return WispState::Deep;
    }
    // Fade: notably slower than normal AND making more errors (cognitive fatigue signal)
    if z.typing_speed < -0.8 && z.error_rate > 0.8 {
        return WispState::Fade;
    }
    // Calm: well below average typing (reading, thinking, very light work)
    if z.typing_speed < -0.8 {
        return WispState::Calm;
    }
    WispState::Focus
}

// ── State machine with 3-minute debounce ─────────────────────────────────────

/// Number of consecutive snapshots in the same state required before committing.
/// At 60s per snapshot: 2 × 60s = 2 minutes.
const DEBOUNCE_SNAPSHOTS: u32 = 2;

pub struct StateMachine {
    pub current_state: WispState,
    candidate_state: WispState,
    candidate_count: u32,
    /// Timestamp (ms) when spark was first entered — used for burn timer.
    pub spark_started_ms: Option<u64>,
    /// Timestamp (ms) when current_state last committed — used by dashboard duration display.
    pub state_entered_ms: Option<u64>,
}

impl StateMachine {
    pub fn new() -> Self {
        Self {
            current_state: WispState::Rest,
            candidate_state: WispState::Rest,
            candidate_count: 0,
            spark_started_ms: None,
            state_entered_ms: None,
        }
    }

    /// Feed a new z-score snapshot. Returns `Some(state)` if state committed.
    pub fn update(&mut self, z: &SignalZScores, now_ms: u64) -> Option<WispState> {
        let spark_secs = self.spark_started_ms
            .map(|start| now_ms.saturating_sub(start) / 1000)
            .unwrap_or(0);

        let candidate = classify_state(z, spark_secs);

        eprintln!(
            "[state_machine] candidate={:?} count={} current={:?}",
            candidate, self.candidate_count + 1, self.current_state,
        );

        // Debounce
        if candidate == self.candidate_state {
            self.candidate_count += 1;
        } else {
            self.candidate_state = candidate;
            self.candidate_count = 1;
        }

        if self.candidate_count >= DEBOUNCE_SNAPSHOTS && candidate != self.current_state {
            self.current_state = candidate;
            self.state_entered_ms = Some(now_ms);
            self.candidate_count = 0;
            // Start spark timer only when Spark is committed, not on raw candidates.
            // This prevents non-consecutive flicker windows from accumulating toward Burn.
            if candidate == WispState::Spark && self.spark_started_ms.is_none() {
                self.spark_started_ms = Some(now_ms);
            } else if !matches!(candidate, WispState::Spark | WispState::Burn) {
                self.spark_started_ms = None;
            }
            return Some(candidate);
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn z(
        typing_speed: f64, error_rate: f64, app_switch_rate: f64,
        mouse_speed: f64, single_window_hold: f64, typing_speed_raw: f64,
    ) -> SignalZScores {
        SignalZScores {
            typing_speed, error_rate, app_switch_rate, mouse_speed,
            mouse_jitter: 0.0, pause_frequency: 0.0,
            single_window_hold, typing_speed_raw,
            undo_redo_rate: 0.0, key_hold_ms: 0.0, save_rate: 0.0,
            right_click_rate: 0.0, scroll_depth: 0.0,
        }
    }

    #[test]
    fn rest_on_near_zero_input() {
        assert_eq!(classify_state(&z(0.0, 0.0, 0.0, -1.0, 0.0, 0.05), 0), WispState::Rest);
    }

    #[test]
    fn burn_after_45_minutes_of_spark() {
        assert_eq!(classify_state(&z(1.5, 1.2, 0.0, 0.5, 0.0, 3.0), 45 * 60), WispState::Burn);
    }

    #[test]
    fn spark_on_fast_typing() {
        assert_eq!(classify_state(&z(2.0, 0.0, 0.0, 0.5, 0.0, 4.0), 0), WispState::Spark);
    }

    #[test]
    fn deep_on_long_window_hold_with_low_switching() {
        assert_eq!(classify_state(&z(0.0, 0.0, -1.5, 0.0, 2.5, 1.5), 0), WispState::Deep);
    }

    #[test]
    fn fade_on_slow_typing_with_errors() {
        assert_eq!(classify_state(&z(-1.0, 1.0, 0.0, 0.0, 0.0, 0.5), 0), WispState::Fade);
    }

    #[test]
    fn calm_on_slow_relaxed_activity() {
        assert_eq!(classify_state(&z(-1.0, -0.5, 0.0, -1.0, 0.0, 0.5), 0), WispState::Calm);
    }

    #[test]
    fn focus_at_slightly_below_average_typing() {
        // z.typing_speed = -0.5 is below average but not calm-level (-0.8)
        assert_eq!(classify_state(&z(-0.5, 0.0, 0.0, 0.0, 0.0, 1.2), 0), WispState::Focus);
    }

    #[test]
    fn focus_is_default() {
        assert_eq!(classify_state(&z(0.0, 0.0, 0.0, 0.0, 0.0, 1.5), 0), WispState::Focus);
    }

    #[test]
    fn debounce_requires_two_consecutive_snapshots() {
        let mut sm = StateMachine::new();
        let spark = z(2.0, 0.0, 0.0, 0.5, 0.0, 4.0);
        assert!(sm.update(&spark, 1_000).is_none());
        let result = sm.update(&spark, 2_000);
        assert_eq!(result, Some(WispState::Spark));
        assert_eq!(sm.current_state, WispState::Spark);
    }

    #[test]
    fn debounce_resets_on_drift() {
        let mut sm = StateMachine::new();
        let spark = z(2.0, 0.0, 0.0, 0.5, 0.0, 4.0);
        let focus = z(0.0, 0.0, 0.0, 0.0, 0.0, 1.5);
        sm.update(&spark, 1_000); // 1 consecutive
        sm.update(&focus, 2_000); // drift — resets count
        sm.update(&spark, 3_000); // 1 since reset
        assert_eq!(sm.current_state, WispState::Rest); // not committed (only 1, need 2)
    }

    #[test]
    fn spark_timer_starts_on_commit_not_candidate() {
        let mut sm = StateMachine::new();
        let spark = z(2.0, 0.0, 0.0, 0.5, 0.0, 4.0);
        sm.update(&spark, 1_000);
        assert!(sm.spark_started_ms.is_none(), "timer must not start before commit");
        sm.update(&spark, 2_000); // second snapshot commits (debounce=2)
        assert!(sm.spark_started_ms.is_some(), "timer must start on commit");
    }

    #[test]
    fn spark_timer_not_accumulated_by_flicker() {
        let mut sm = StateMachine::new();
        let spark = z(2.0, 0.0, 0.0, 0.5, 0.0, 4.0);
        let focus = z(0.0, 0.0, 0.0, 0.0, 0.0, 1.5);
        // One spark candidate followed by drift — should not start timer
        sm.update(&spark, 1_000);
        sm.update(&focus, 2_000); // drift before debounce reached
        assert!(sm.spark_started_ms.is_none(), "timer must not start after flicker");
    }

    #[test]
    fn burn_timer_clears_when_leaving_spark() {
        let mut sm = StateMachine::new();
        let spark = z(2.0, 0.0, 0.0, 0.5, 0.0, 4.0);
        let focus = z(0.0, 0.0, 0.0, 0.0, 0.0, 1.5);
        // Commit spark (debounce=2)
        for i in 0..2 { sm.update(&spark, i * 1_000); }
        assert!(sm.spark_started_ms.is_some());
        // Leave spark (debounce=2)
        for i in 2..4 { sm.update(&focus, i * 1_000); }
        assert!(sm.spark_started_ms.is_none());
    }

    #[test]
    fn state_entered_ms_set_on_commit() {
        let mut sm = StateMachine::new();
        let spark = z(2.0, 0.0, 0.0, 0.5, 0.0, 4.0);
        sm.update(&spark, 1_000);
        assert!(sm.state_entered_ms.is_none(), "should not be set before commit");
        sm.update(&spark, 2_000); // debounce=2, commits here
        assert_eq!(sm.state_entered_ms, Some(2_000), "should record commit time");
    }

    #[test]
    fn state_entered_ms_updates_on_new_state() {
        let mut sm = StateMachine::new();
        let spark = z(2.0, 0.0, 0.0, 0.5, 0.0, 4.0);
        let focus = z(0.0, 0.0, 0.0, 0.0, 0.0, 1.5);
        for i in 0..2u64 { sm.update(&spark, i * 1_000); }
        assert_eq!(sm.state_entered_ms, Some(1_000));
        for i in 2..4u64 { sm.update(&focus, i * 1_000); }
        assert_eq!(sm.state_entered_ms, Some(3_000));
    }
}
