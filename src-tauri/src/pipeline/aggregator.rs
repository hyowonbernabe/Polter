use crate::sensors::system::SystemSnapshot;
use crate::pipeline::ring_buffer::RawInputEvent;

#[derive(Debug, Clone)]
pub struct BehavioralSnapshot {
    pub session_id: i64,
    pub timestamp_ms: i64,
    pub typing_speed: f64,
    pub error_rate: f64,
    pub pause_count: i32,
    pub mouse_speed: f64,
    pub mouse_jitter: f64,
    pub click_count: i32,
    pub scroll_count: i32,
    pub cpu_percent: f32,
    pub ram_percent: f32,
    pub battery_percent: i32,
    pub on_battery: bool,
    pub window_count: i32,
    pub foreground_app: String,
}

pub fn compute_snapshot(
    _events: &[RawInputEvent],
    _system: &SystemSnapshot,
    _session_id: i64,
    _window_end_ms: u64,
    _window_duration_secs: f64,
) -> BehavioralSnapshot {
    // Filled in Task 6
    BehavioralSnapshot {
        session_id: _session_id,
        timestamp_ms: _window_end_ms as i64,
        typing_speed: 0.0,
        error_rate: 0.0,
        pause_count: 0,
        mouse_speed: 0.0,
        mouse_jitter: 0.0,
        click_count: 0,
        scroll_count: 0,
        cpu_percent: _system.cpu_percent,
        ram_percent: _system.ram_percent,
        battery_percent: _system.battery_percent,
        on_battery: _system.on_battery,
        window_count: _system.window_count,
        foreground_app: _system.foreground_app.clone(),
    }
}

pub fn start(
    _ring: std::sync::Arc<std::sync::Mutex<crate::pipeline::ring_buffer::RingBuffer>>,
    _system: std::sync::Arc<std::sync::RwLock<SystemSnapshot>>,
    _session_id: std::sync::Arc<std::sync::Mutex<Option<i64>>>,
) {
    // Filled in Task 11
}
