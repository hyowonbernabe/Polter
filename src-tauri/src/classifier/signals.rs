use crate::pipeline::aggregator::BehavioralSnapshot;
use crate::storage::queries::BaselineRow;
use std::collections::HashMap;

/// Z-scores computed from one 60-second behavioral snapshot.
///
/// **Intentionally absent signals:**
/// - Right-click rate: raw `click_count` includes all buttons; right-click
///   frequency is not meaningful enough as a standalone behavioral signal.
/// - Zoom events: not captured at the input layer.
/// - File-save / screenshot: when these are added as context signals they must
///   be treated as low-impact context only — they cannot be the sole driver of
///   an insight on their own. Enforce this in `classify_state` weighting.
#[derive(Debug, Clone, Default)]
pub struct SignalZScores {
    pub typing_speed: f64,
    pub error_rate: f64,
    pub app_switch_rate: f64,
    pub mouse_speed: f64,
    pub mouse_jitter: f64,
    pub pause_frequency: f64,
    pub single_window_hold: f64,
    /// Raw keys/sec — used for absolute rest threshold.
    pub typing_speed_raw: f64,
}

pub struct PopulationDefault {
    pub mean: f64,
    pub std: f64,
}

pub fn population_defaults(signal: &str) -> PopulationDefault {
    match signal {
        "typing_speed"       => PopulationDefault { mean: 2.0,   std: 1.5   },
        "error_rate"         => PopulationDefault { mean: 0.08,  std: 0.05  },
        "app_switch_rate"    => PopulationDefault { mean: 0.05,  std: 0.04  },
        "mouse_speed"        => PopulationDefault { mean: 200.0, std: 150.0 },
        "mouse_jitter"       => PopulationDefault { mean: 50.0,  std: 40.0  },
        "pause_frequency"    => PopulationDefault { mean: 0.05,  std: 0.04  },
        "single_window_hold" => PopulationDefault { mean: 120.0, std: 180.0 },
        _                    => PopulationDefault { mean: 0.0,   std: 1.0   },
    }
}

fn z_score(value: f64, mean: f64, variance: f64) -> f64 {
    let std = variance.sqrt();
    if std < 1e-9 { return 0.0; }
    (value - mean) / std
}

/// Returns (mean, variance) — from personal baseline if available with ≥3 samples,
/// otherwise from population defaults.
fn mean_and_variance(row: Option<&BaselineRow>, signal: &str) -> (f64, f64) {
    if let Some(r) = row {
        if r.sample_count >= 3 {
            return (r.ema_mean, r.ema_variance);
        }
    }
    let d = population_defaults(signal);
    (d.mean, d.std * d.std)
}

/// Converts a behavioral snapshot into z-scores relative to the provided baselines.
/// Missing baseline keys fall back to population defaults automatically.
pub fn compute_z_scores(
    snap: &BehavioralSnapshot,
    window_secs: f64,
    baselines: &HashMap<String, BaselineRow>,
) -> SignalZScores {
    let get = |sig: &str| mean_and_variance(baselines.get(sig), sig);

    let app_switch_rate = if window_secs > 0.0 {
        snap.app_switch_count as f64 / window_secs
    } else {
        0.0
    };
    let pause_frequency = if window_secs > 0.0 {
        snap.pause_count as f64 / window_secs
    } else {
        0.0
    };
    let single_window_hold_secs = snap.single_window_hold_ms as f64 / 1000.0;

    let (ts_mean,  ts_var)  = get("typing_speed");
    let (er_mean,  er_var)  = get("error_rate");
    let (asr_mean, asr_var) = get("app_switch_rate");
    let (ms_mean,  ms_var)  = get("mouse_speed");
    let (mj_mean,  mj_var)  = get("mouse_jitter");
    let (pf_mean,  pf_var)  = get("pause_frequency");
    let (swh_mean, swh_var) = get("single_window_hold");

    SignalZScores {
        typing_speed:       z_score(snap.typing_speed,        ts_mean,  ts_var),
        error_rate:         z_score(snap.error_rate,          er_mean,  er_var),
        app_switch_rate:    z_score(app_switch_rate,          asr_mean, asr_var),
        mouse_speed:        z_score(snap.mouse_speed,         ms_mean,  ms_var),
        mouse_jitter:       z_score(snap.mouse_jitter,        mj_mean,  mj_var),
        pause_frequency:    z_score(pause_frequency,          pf_mean,  pf_var),
        single_window_hold: z_score(single_window_hold_secs,  swh_mean, swh_var),
        typing_speed_raw:   snap.typing_speed,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_snap() -> BehavioralSnapshot {
        BehavioralSnapshot {
            session_id: 1, timestamp_ms: 1_000_000,
            typing_speed: 2.0, error_rate: 0.08,
            pause_count: 3, mouse_speed: 200.0, mouse_jitter: 50.0,
            click_count: 5, scroll_count: 2,
            cpu_percent: 25.0, ram_percent: 60.0, battery_percent: 80,
            on_battery: false, window_count: 5,
            foreground_app: "code.exe".to_string(),
            app_switch_count: 3, single_window_hold_ms: 120_000,
        }
    }

    #[test]
    fn z_score_at_population_mean_is_zero() {
        let snap = make_snap(); // typing_speed = 2.0 == population mean
        let z = compute_z_scores(&snap, 60.0, &HashMap::new());
        assert!(z.typing_speed.abs() < 0.001, "expected ~0, got {}", z.typing_speed);
    }

    #[test]
    fn z_score_one_std_above_mean_equals_one() {
        let mut snap = make_snap();
        snap.typing_speed = 3.5; // 2.0 + 1.5 = one std above
        let z = compute_z_scores(&snap, 60.0, &HashMap::new());
        assert!((z.typing_speed - 1.0).abs() < 0.01, "expected ~1.0, got {}", z.typing_speed);
    }

    #[test]
    fn uses_personal_baseline_when_sample_count_gte_3() {
        let snap = make_snap(); // typing_speed = 2.0
        let mut baselines = HashMap::new();
        baselines.insert("typing_speed".to_string(), BaselineRow {
            signal: "typing_speed".to_string(),
            time_of_day_bucket: 1, day_of_week: 1,
            ema_mean: 1.0, ema_variance: 0.25, // std=0.5
            sample_count: 5, last_updated_ms: 0,
        });
        let z = compute_z_scores(&snap, 60.0, &baselines);
        // z = (2.0 - 1.0) / 0.5 = 2.0
        assert!((z.typing_speed - 2.0).abs() < 0.01, "expected ~2.0, got {}", z.typing_speed);
    }

    #[test]
    fn falls_back_to_population_defaults_when_sample_count_lt_3() {
        let snap = make_snap();
        let mut baselines = HashMap::new();
        baselines.insert("typing_speed".to_string(), BaselineRow {
            signal: "typing_speed".to_string(),
            time_of_day_bucket: 1, day_of_week: 1,
            ema_mean: 99.0, ema_variance: 1.0,
            sample_count: 2, // below threshold
            last_updated_ms: 0,
        });
        let z = compute_z_scores(&snap, 60.0, &baselines);
        // Should use population default (mean=2.0), not the personal baseline (mean=99.0)
        assert!(z.typing_speed.abs() < 0.01, "expected ~0, got {}", z.typing_speed);
    }

    #[test]
    fn app_switch_rate_derived_from_count_and_window() {
        let mut snap = make_snap();
        snap.app_switch_count = 6; // 6 / 60s = 0.1/s
        let z = compute_z_scores(&snap, 60.0, &HashMap::new());
        // population default: mean=0.05, std=0.04 → z=(0.1-0.05)/0.04=1.25
        assert!((z.app_switch_rate - 1.25).abs() < 0.1, "expected ~1.25, got {}", z.app_switch_rate);
    }
}
