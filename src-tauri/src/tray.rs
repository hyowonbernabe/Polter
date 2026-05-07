/// Raw 32×32 RGBA ghost sprite, embedded at compile time.
const GHOST_RGBA: &[u8; 4096] = include_bytes!("../icons/tray-ghost-32x32.rgba");
const SIZE: u32 = 32;

/// Returns the RGB color for a given state name (Polter mood palette).
pub fn state_to_tray_color(state: &str) -> (u8, u8, u8) {
    match state {
        "focus" => (122, 158, 139),  // #7a9e8b  mood-calm (sage)
        "calm"  => (138, 174, 155),  // #8aae9b  lighter sage
        "deep"  => (212, 184, 122),  // #d4b87a  mood-curious (candlelight)
        "spark" => (212, 184, 122),  // #d4b87a  mood-curious (candlelight)
        "burn"  => (192, 138, 100),  // #c08a64  mood-restless (clay)
        "fade"  => (142, 127, 168),  // #8e7fa8  mood-tired (dusk lavender)
        _       => ( 79,  90, 110),  // #4f5a6e  mood-asleep (deep slate)
    }
}

/// Generates a 32×32 RGBA icon using the ghost sprite with a state-colored
/// glow circle behind it.
pub fn tray_icon_rgba(r: u8, g: u8, b: u8) -> Vec<u8> {
    let mut data = Vec::with_capacity((SIZE * SIZE * 4) as usize);
    let center = SIZE as f32 / 2.0;
    let radius = SIZE as f32 / 2.0 - 1.5;

    for y in 0..SIZE {
        for x in 0..SIZE {
            let idx = ((y * SIZE + x) * 4) as usize;
            let ga = GHOST_RGBA[idx + 3]; // ghost alpha

            if ga > 0 {
                // Ghost pixel — use it directly
                data.extend_from_slice(&GHOST_RGBA[idx..idx + 4]);
            } else {
                // Background — draw a soft colored circle behind the ghost
                let dx = x as f32 + 0.5 - center;
                let dy = y as f32 + 0.5 - center;
                let dist = (dx * dx + dy * dy).sqrt();
                if dist <= radius {
                    // Fade alpha toward the edge for a soft glow
                    let t = (1.0 - dist / radius).max(0.0);
                    let alpha = (t * t * 120.0) as u8; // soft falloff, max ~120
                    data.extend_from_slice(&[r, g, b, alpha]);
                } else {
                    data.extend_from_slice(&[0, 0, 0, 0]);
                }
            }
        }
    }
    data
}

/// Same as tray_icon_rgba but draws a small colored dot in the top-right corner
/// to indicate a pending insight bubble.
pub fn tray_icon_rgba_with_dot(r: u8, g: u8, b: u8, has_dot: bool) -> Vec<u8> {
    let mut data = tray_icon_rgba(r, g, b);
    if !has_dot {
        return data;
    }
    const DOT_CX: f32 = 25.5;
    const DOT_CY: f32 = 6.5;
    const DOT_R: f32 = 4.0;
    for y in 0..SIZE {
        for x in 0..SIZE {
            let dx = x as f32 + 0.5 - DOT_CX;
            let dy = y as f32 + 0.5 - DOT_CY;
            let dist = (dx * dx + dy * dy).sqrt();
            if dist <= DOT_R {
                let idx = ((y * SIZE + x) * 4) as usize;
                // Accent candlelight color for the dot
                data[idx]     = 212;
                data[idx + 1] = 184;
                data[idx + 2] = 122;
                data[idx + 3] = 255;
            }
        }
    }
    data
}

/// Re-renders the tray icon using the ghost sprite with state-colored glow.
pub fn update_tray(has_dot: bool, state_str: Option<&str>, app_handle: &tauri::AppHandle) {
    let Some(tray) = app_handle.tray_by_id("main") else { return };
    let state = state_str.unwrap_or("rest");
    let (r, g, b) = state_to_tray_color(state);
    let rgba = tray_icon_rgba_with_dot(r, g, b, has_dot);
    let icon = tauri::image::Image::new_owned(rgba, SIZE, SIZE);
    let _ = tray.set_icon(Some(icon));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ghost_rgba_correct_size() {
        assert_eq!(GHOST_RGBA.len(), (SIZE * SIZE * 4) as usize);
    }

    #[test]
    fn state_colors_all_states_covered() {
        for state in &["focus", "calm", "deep", "spark", "burn", "fade", "rest"] {
            let (r, g, b) = state_to_tray_color(state);
            assert!(r > 0 || g > 0 || b > 0, "color for {state} is pure black");
        }
    }

    #[test]
    fn tray_icon_rgba_correct_size() {
        let data = tray_icon_rgba(122, 158, 139);
        assert_eq!(data.len(), (SIZE * SIZE * 4) as usize);
    }

    #[test]
    fn tray_icon_has_some_opaque_pixels() {
        let data = tray_icon_rgba(122, 158, 139);
        let opaque = (0..data.len())
            .step_by(4)
            .filter(|&i| data[i + 3] > 0)
            .count();
        assert!(opaque > 100, "icon should have many visible pixels, got {opaque}");
    }

    #[test]
    fn burn_color_is_distinct_from_rest() {
        let burn = state_to_tray_color("burn");
        let rest = state_to_tray_color("rest");
        assert_ne!(burn, rest);
    }

    #[test]
    fn dot_icon_differs_from_plain() {
        let plain = tray_icon_rgba(122, 158, 139);
        let dotted = tray_icon_rgba_with_dot(122, 158, 139, true);
        assert_ne!(plain, dotted);
    }

    #[test]
    fn no_dot_icon_equals_plain() {
        let plain = tray_icon_rgba(122, 158, 139);
        let no_dot = tray_icon_rgba_with_dot(122, 158, 139, false);
        assert_eq!(plain, no_dot);
    }
}
