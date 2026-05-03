use rdevin::{listen, Button, EventType, Key};
use serde::Serialize;
use std::io::{self, BufWriter, Write};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum InputEvent {
    KeyDown { ts: u64, is_deletion: bool },
    KeyUp { ts: u64 },
    MouseMove { x: f64, y: f64, ts: u64 },
    MouseClick { button: u8, ts: u64 }, // 0=left,1=right,2=middle,3=other
    Scroll { delta_x: i64, delta_y: i64, ts: u64 },
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

    listen(move |event| {
        let ts = now_ms();
        let evt: Option<InputEvent> = match event.event_type {
            EventType::KeyPress(key) => {
                let is_deletion = matches!(key, Key::Backspace | Key::Delete);
                Some(InputEvent::KeyDown { ts, is_deletion })
            }
            EventType::KeyRelease(_) => Some(InputEvent::KeyUp { ts }),
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
