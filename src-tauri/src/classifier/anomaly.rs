use crate::classifier::signals::SignalZScores;
use std::collections::HashMap;

const ANOMALY_Z_THRESHOLD: f64 = 1.96;
/// Snapshots the signal must exceed the threshold before firing.
/// 5 × 60s = 5 minutes.
const SUSTAIN_SNAPSHOTS: u32 = 5;
/// Minimum ms between successive firings of the same anomaly type.
const COOLDOWN_MS: u64 = 2 * 60 * 60 * 1000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnomalyDirection { High, Low }

#[derive(Debug, Clone)]
pub struct AnomalyEvent {
    pub signal: String,
    pub direction: AnomalyDirection,
}

struct Candidate {
    consecutive: u32,
    last_fired_ms: Option<u64>,
}

pub struct AnomalyDetector {
    // Key: (signal_name, is_high)
    candidates: HashMap<(String, bool), Candidate>,
}

impl AnomalyDetector {
    pub fn new() -> Self {
        Self { candidates: HashMap::new() }
    }

    /// Checks all signals. Returns any anomalies that fired.
    /// Suppressed entirely when `cold_start` is true.
    pub fn check(
        &mut self,
        z: &SignalZScores,
        now_ms: u64,
        cold_start: bool,
    ) -> Vec<AnomalyEvent> {
        if cold_start { return Vec::new(); }

        let signal_z = [
            ("typing_speed",       z.typing_speed),
            ("error_rate",         z.error_rate),
            ("app_switch_rate",    z.app_switch_rate),
            ("mouse_speed",        z.mouse_speed),
            ("mouse_jitter",       z.mouse_jitter),
            ("pause_frequency",    z.pause_frequency),
            ("single_window_hold", z.single_window_hold),
        ];

        let mut fired = Vec::new();

        for (signal, z_val) in signal_z {
            for is_high in [true, false] {
                let exceeds = if is_high {
                    z_val > ANOMALY_Z_THRESHOLD
                } else {
                    z_val < -ANOMALY_Z_THRESHOLD
                };

                let key = (signal.to_string(), is_high);
                let entry = self.candidates.entry(key).or_insert(Candidate {
                    consecutive: 0,
                    last_fired_ms: None,
                });

                if exceeds {
                    entry.consecutive += 1;
                } else {
                    entry.consecutive = 0;
                    continue;
                }

                if entry.consecutive < SUSTAIN_SNAPSHOTS { continue; }

                if let Some(last) = entry.last_fired_ms {
                    if now_ms.saturating_sub(last) < COOLDOWN_MS { continue; }
                }

                entry.last_fired_ms = Some(now_ms);
                entry.consecutive = 0;
                fired.push(AnomalyEvent {
                    signal: signal.to_string(),
                    direction: if is_high { AnomalyDirection::High } else { AnomalyDirection::Low },
                });
            }
        }
        fired
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn high_typing() -> SignalZScores {
        SignalZScores {
            typing_speed: 2.5,
            ..Default::default()
        }
    }

    #[test]
    fn suppressed_during_cold_start() {
        let mut det = AnomalyDetector::new();
        let z = high_typing();
        for i in 0..10 {
            assert!(det.check(&z, i * 60_000, true).is_empty());
        }
    }

    #[test]
    fn does_not_fire_before_sustain_threshold() {
        let mut det = AnomalyDetector::new();
        let z = high_typing();
        for i in 0..(SUSTAIN_SNAPSHOTS - 1) {
            assert!(
                det.check(&z, i as u64 * 60_000, false).is_empty(),
                "should not fire at snapshot {i}"
            );
        }
    }

    #[test]
    fn fires_exactly_at_sustain_threshold() {
        let mut det = AnomalyDetector::new();
        let z = high_typing();
        let mut all_fired = Vec::new();
        for i in 0..SUSTAIN_SNAPSHOTS {
            all_fired.extend(det.check(&z, i as u64 * 60_000, false));
        }
        assert_eq!(all_fired.len(), 1);
        assert_eq!(all_fired[0].signal, "typing_speed");
        assert_eq!(all_fired[0].direction, AnomalyDirection::High);
    }

    #[test]
    fn respects_2h_cooldown() {
        let mut det = AnomalyDetector::new();
        let z = high_typing();
        // Trigger first fire
        for i in 0..SUSTAIN_SNAPSHOTS {
            det.check(&z, i as u64 * 60_000, false);
        }
        // Immediately after — within cooldown
        let result = det.check(&z, SUSTAIN_SNAPSHOTS as u64 * 60_000, false);
        assert!(result.is_empty(), "should be in cooldown");
    }

    #[test]
    fn resets_counter_on_normal_reading() {
        let mut det = AnomalyDetector::new();
        let z_high = high_typing();
        let z_norm = SignalZScores::default();
        // 4 high readings
        for i in 0..4u64 { det.check(&z_high, i * 60_000, false); }
        // Back to normal — resets
        det.check(&z_norm, 4 * 60_000, false);
        // 5 more high — fires on 5th
        let mut fired = Vec::new();
        for i in 0..SUSTAIN_SNAPSHOTS {
            fired.extend(det.check(&z_high, (5 + i as u64) * 60_000, false));
        }
        assert_eq!(fired.len(), 1);
    }
}
