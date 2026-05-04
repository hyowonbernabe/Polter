/// Returns the RGB color for a given state name.
pub fn state_to_tray_color(state: &str) -> (u8, u8, u8) {
    match state {
        "focus" => (107, 163, 214),  // #6ba3d6
        "calm"  => ( 95, 154, 191),  // #5f9abf
        "deep"  => ( 58, 106, 154),  // #3a6a9a
        "spark" => (244, 163,  71),  // #f4a347
        "burn"  => (204,  68,   0),  // #cc4400
        "fade"  => (142, 127, 168),  // #8e7fa8
        _       => (144, 144, 168),  // #909090 (rest / unknown)
    }
}

/// Generates a 32×32 RGBA circle filled with the given color (transparent outside).
pub fn tray_icon_rgba(r: u8, g: u8, b: u8) -> Vec<u8> {
    const SIZE: u32 = 32;
    const CENTER: f32 = SIZE as f32 / 2.0;
    const RADIUS: f32 = SIZE as f32 / 2.0 - 1.5;
    let mut data = Vec::with_capacity((SIZE * SIZE * 4) as usize);
    for y in 0..SIZE {
        for x in 0..SIZE {
            let dx = x as f32 + 0.5 - CENTER;
            let dy = y as f32 + 0.5 - CENTER;
            let dist = (dx * dx + dy * dy).sqrt();
            if dist <= RADIUS {
                data.extend_from_slice(&[r, g, b, 255]);
            } else {
                data.extend_from_slice(&[0, 0, 0, 0]);
            }
        }
    }
    data
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn state_colors_all_states_covered() {
        for state in &["focus", "calm", "deep", "spark", "burn", "fade", "rest"] {
            let (r, g, b) = state_to_tray_color(state);
            assert!(r > 0 || g > 0 || b > 0, "color for {state} is pure black");
        }
    }

    #[test]
    fn tray_icon_rgba_correct_size() {
        let data = tray_icon_rgba(107, 163, 214);
        assert_eq!(data.len(), 32 * 32 * 4);
    }

    #[test]
    fn tray_icon_center_pixel_is_opaque() {
        let data = tray_icon_rgba(107, 163, 214);
        // Center pixel is at row 15, col 15 → index (15 * 32 + 15) * 4
        let idx = (15 * 32 + 15) * 4;
        assert_eq!(data[idx + 3], 255, "center alpha should be 255");
    }

    #[test]
    fn tray_icon_corner_pixel_is_transparent() {
        let data = tray_icon_rgba(107, 163, 214);
        // Top-left corner pixel
        assert_eq!(data[3], 0, "corner alpha should be 0");
    }

    #[test]
    fn burn_color_is_distinct_from_rest() {
        let burn = state_to_tray_color("burn");
        let rest = state_to_tray_color("rest");
        assert_ne!(burn, rest);
    }

    #[test]
    fn rgba_values_match_state_color() {
        let (r, g, b) = state_to_tray_color("focus");
        let data = tray_icon_rgba(r, g, b);
        let idx = (15 * 32 + 15) * 4;
        assert_eq!(data[idx], r);
        assert_eq!(data[idx + 1], g);
        assert_eq!(data[idx + 2], b);
    }
}
