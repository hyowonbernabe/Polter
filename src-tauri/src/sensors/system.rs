#[derive(Debug, Clone, Default)]
pub struct SystemSnapshot {
    pub timestamp_ms: u64,
    pub cpu_percent: f32,
    pub ram_percent: f32,
    pub battery_percent: i32,
    pub on_battery: bool,
    pub window_count: i32,
    pub foreground_app: String,
}
