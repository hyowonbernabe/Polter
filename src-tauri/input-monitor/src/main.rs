use rdevin::{listen, Button, EventType, Key};
use serde::Serialize;
use std::collections::VecDeque;
use std::io::{self, BufWriter, Write};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum InputEvent {
    KeyDown {
        ts: u64,
        is_deletion: bool,
        is_undo: bool,
        is_redo: bool,
        is_save: bool,
    },
    KeyHold {
        ts: u64,
        hold_ms: u64,
    },
    MouseMove {
        x: f64,
        y: f64,
        ts: u64,
    },
    MouseClick {
        button: u8,
        ts: u64,
    },
    Scroll {
        delta_x: i64,
        delta_y: i64,
        ts: u64,
    },
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn main() {
    let stdout = io::stdout();
    let mut writer = BufWriter::new(stdout.lock());
    let mut ctrl_held = false;
    let mut pending_keydowns: VecDeque<u64> = VecDeque::new();

    listen(move |event| {
        let ts = now_ms();
        let evt: Option<InputEvent> = match event.event_type {
            EventType::KeyPress(key) => match key {
                Key::ControlLeft | Key::ControlRight => {
                    ctrl_held = true;
                    None
                }
                _ => {
                    let is_deletion = matches!(key, Key::Backspace | Key::Delete);
                    let is_undo = ctrl_held && matches!(key, Key::KeyZ);
                    let is_redo = ctrl_held && matches!(key, Key::KeyY);
                    let is_save = ctrl_held && matches!(key, Key::KeyS);
                    pending_keydowns.push_back(ts);
                    if pending_keydowns.len() > 10 {
                        pending_keydowns.pop_front();
                    }
                    Some(InputEvent::KeyDown { ts, is_deletion, is_undo, is_redo, is_save })
                }
            },
            EventType::KeyRelease(key) => match key {
                Key::ControlLeft | Key::ControlRight => {
                    ctrl_held = false;
                    None
                }
                _ => {
                    if let Some(press_ts) = pending_keydowns.pop_front() {
                        let hold_ms = ts.saturating_sub(press_ts);
                        Some(InputEvent::KeyHold { ts, hold_ms })
                    } else {
                        None
                    }
                }
            },
            EventType::ButtonPress(button) => {
                let btn = match button {
                    Button::Left => 0,
                    Button::Right => 1,
                    Button::Middle => 2,
                    _ => 3,
                };
                Some(InputEvent::MouseClick { button: btn, ts })
            }
            EventType::ButtonRelease(_) => None,
            EventType::MouseMove { x, y } => Some(InputEvent::MouseMove { x, y, ts }),
            EventType::Wheel { delta_x, delta_y } => {
                Some(InputEvent::Scroll { delta_x, delta_y, ts })
            }
        };

        if let Some(e) = evt {
            if let Ok(line) = serde_json::to_string(&e) {
                let _ = writeln!(writer, "{}", line);
                let _ = writer.flush();
            }
        }
    })
    .expect("rdevin listen failed");
}
