pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub fn point_in_rect(px: f64, py: f64, r: &Rect) -> bool {
    px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height
}
