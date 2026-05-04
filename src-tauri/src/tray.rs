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

/// Same as tray_icon_rgba but draws a small white dot in the top-right corner
/// to indicate a pending insight bubble.
pub fn tray_icon_rgba_with_dot(r: u8, g: u8, b: u8, has_dot: bool) -> Vec<u8> {
    let mut data = tray_icon_rgba(r, g, b);
    if !has_dot {
        return data;
    }
    const SIZE: u32 = 32;
    const DOT_CX: f32 = 24.5;
    const DOT_CY: f32 = 7.5;
    const DOT_R: f32 = 4.5;
    for y in 0..SIZE {
        for x in 0..SIZE {
            let dx = x as f32 + 0.5 - DOT_CX;
            let dy = y as f32 + 0.5 - DOT_CY;
            if (dx * dx + dy * dy).sqrt() <= DOT_R {
                let idx = ((y * SIZE + x) * 4) as usize;
                data[idx]     = 255;
                data[idx + 1] = 255;
                data[idx + 2] = 255;
                data[idx + 3] = 255;
            }
        }
    }
    data
}

/// Re-renders the tray icon using the given state color, with or without the dot.
pub fn update_tray(has_dot: bool, state_str: Option<&str>, app_handle: &tauri::AppHandle) {
    let Some(tray) = app_handle.tray_by_id("main") else { return };
    let state = state_str.unwrap_or("rest");
    let (r, g, b) = state_to_tray_color(state);
    let rgba = tray_icon_rgba_with_dot(r, g, b, has_dot);
    let icon = tauri::image::Image::new_owned(rgba, 32, 32);
    let _ = tray.set_icon(Some(icon));
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

    #[test]
    fn dot_icon_differs_from_plain() {
        let plain = tray_icon_rgba(107, 163, 214);
        let dotted = tray_icon_rgba_with_dot(107, 163, 214, true);
        assert_ne!(plain, dotted);
    }

    #[test]
    fn no_dot_icon_equals_plain() {
        let plain = tray_icon_rgba(107, 163, 214);
        let no_dot = tray_icon_rgba_with_dot(107, 163, 214, false);
        assert_eq!(plain, no_dot);
    }

    #[test]
    fn dot_pixel_is_white() {
        let data = tray_icon_rgba_with_dot(107, 163, 214, true);
        // Pixel at (24, 7) should be white
        let idx = (7 * 32 + 24) * 4;
        assert_eq!(data[idx],     255);
        assert_eq!(data[idx + 1], 255);
        assert_eq!(data[idx + 2], 255);
        assert_eq!(data[idx + 3], 255);
    }
}
