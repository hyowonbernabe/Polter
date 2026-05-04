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
    // Deep: one window held for a long time, low app switching
    if z.single_window_hold > 1.0 && z.app_switch_rate < 0.0 && z.typing_speed.abs() < 1.5 {
        return WispState::Deep;
    }
    // Fade: slower than normal AND making more errors (cognitive fatigue signal)
    if z.typing_speed < -0.5 && z.error_rate > 0.5 {
        return WispState::Fade;
    }
    // Calm: generally slow, relaxed
    if z.typing_speed < -0.5 && z.mouse_speed < 0.0 {
        return WispState::Calm;
    }
    WispState::Focus
}

// ── State machine with 3-minute debounce ─────────────────────────────────────

/// Number of consecutive snapshots in the same state required before committing.
/// At 60s per snapshot: 3 × 60s = 3 minutes.
const DEBOUNCE_SNAPSHOTS: u32 = 3;

pub struct StateMachine {
    pub current_state: WispState,
    candidate_state: WispState,
    candidate_count: u32,
    /// Timestamp (ms) when spark was first entered — used for burn timer.
    pub spark_started_ms: Option<u64>,
}

impl StateMachine {
    pub fn new() -> Self {
        Self {
            current_state: WispState::Rest,
            candidate_state: WispState::Rest,
            candidate_count: 0,
            spark_started_ms: None,
        }
    }

    /// Feed a new z-score snapshot. Returns `Some(state)` if state committed.
    pub fn update(&mut self, z: &SignalZScores, now_ms: u64) -> Option<WispState> {
        let spark_secs = self.spark_started_ms
            .map(|start| now_ms.saturating_sub(start) / 1000)
            .unwrap_or(0);

        let candidate = classify_state(z, spark_secs);

        // Track spark start time for burn detection
        if candidate == WispState::Spark && self.spark_started_ms.is_none() {
            self.spark_started_ms = Some(now_ms);
        }
        if !matches!(candidate, WispState::Spark | WispState::Burn) {
            self.spark_started_ms = None;
        }

        // Debounce
        if candidate == self.candidate_state {
            self.candidate_count += 1;
        } else {
            self.candidate_state = candidate;
            self.candidate_count = 1;
        }

        if self.candidate_count >= DEBOUNCE_SNAPSHOTS && candidate != self.current_state {
            self.current_state = candidate;
            self.candidate_count = 0;
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
        assert_eq!(classify_state(&z(0.0, 0.0, -1.0, 0.0, 1.5, 1.5), 0), WispState::Deep);
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
    fn focus_is_default() {
        assert_eq!(classify_state(&z(0.0, 0.0, 0.0, 0.0, 0.0, 1.5), 0), WispState::Focus);
    }

    #[test]
    fn debounce_requires_three_consecutive_snapshots() {
        let mut sm = StateMachine::new();
        let spark = z(2.0, 0.0, 0.0, 0.5, 0.0, 4.0);
        assert!(sm.update(&spark, 1_000).is_none());
        assert!(sm.update(&spark, 2_000).is_none());
        let result = sm.update(&spark, 3_000);
        assert_eq!(result, Some(WispState::Spark));
        assert_eq!(sm.current_state, WispState::Spark);
    }

    #[test]
    fn debounce_resets_on_drift() {
        let mut sm = StateMachine::new();
        let spark = z(2.0, 0.0, 0.0, 0.5, 0.0, 4.0);
        let focus = z(0.0, 0.0, 0.0, 0.0, 0.0, 1.5);
        sm.update(&spark, 1_000);
        sm.update(&spark, 2_000); // 2 consecutive
        sm.update(&focus, 3_000); // drift — resets count
        sm.update(&spark, 4_000);
        sm.update(&spark, 5_000); // only 2 since reset
        assert_eq!(sm.current_state, WispState::Rest); // not committed
    }

    #[test]
    fn burn_timer_clears_when_leaving_spark() {
        let mut sm = StateMachine::new();
        let spark = z(2.0, 0.0, 0.0, 0.5, 0.0, 4.0);
        let focus = z(0.0, 0.0, 0.0, 0.0, 0.0, 1.5);
        // Commit spark
        for i in 0..3 { sm.update(&spark, i * 1_000); }
        assert!(sm.spark_started_ms.is_some());
        // Leave spark
        for i in 3..6 { sm.update(&focus, i * 1_000); }
        assert!(sm.spark_started_ms.is_none());
    }
}
