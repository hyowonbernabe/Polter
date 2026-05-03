use crate::pipeline::ring_buffer::{MouseButton, RawInputEvent, RingBuffer};
use serde::Deserialize;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum IpcEvent {
    KeyDown { ts: u64, is_deletion: bool },
    KeyUp { ts: u64 },
    MouseMove { x: f64, y: f64, ts: u64 },
    MouseClick { button: u8, ts: u64 },
    Scroll { delta_x: i64, delta_y: i64, ts: u64 },
}

fn monitor_binary_path() -> PathBuf {
    #[cfg(debug_assertions)]
    {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("target/debug/input-monitor.exe")
    }
    #[cfg(not(debug_assertions))]
    {
        std::env::current_exe()
            .unwrap()
            .parent()
            .unwrap()
            .join("input-monitor.exe")
    }
}

fn ipc_to_raw(ipc: IpcEvent) -> RawInputEvent {
    match ipc {
        IpcEvent::KeyDown { ts, is_deletion } => {
            RawInputEvent::KeyDown { ts_ms: ts, is_deletion }
        }
        IpcEvent::KeyUp { ts } => RawInputEvent::KeyUp { ts_ms: ts },
        IpcEvent::MouseMove { x, y, ts } => RawInputEvent::MouseMove { x, y, ts_ms: ts },
        IpcEvent::MouseClick { button, ts } => {
            let btn = match button {
                0 => MouseButton::Left,
                1 => MouseButton::Right,
                2 => MouseButton::Middle,
                _ => MouseButton::Other,
            };
            RawInputEvent::MouseClick { button: btn, ts_ms: ts }
        }
        IpcEvent::Scroll { delta_x, delta_y, ts } => {
            RawInputEvent::Scroll { delta_x, delta_y, ts_ms: ts }
        }
    }
}

pub fn start(ring: Arc<Mutex<RingBuffer>>) {
    tokio::spawn(async move {
        let path = monitor_binary_path();
        loop {
            match Command::new(&path)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::null())
                .spawn()
            {
                Err(e) => {
                    eprintln!("[input_host] failed to spawn: {e}");
                    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                }
                Ok(mut child) => {
                    let stdout = child.stdout.take().unwrap();
                    let mut reader = BufReader::new(stdout).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        if let Ok(ipc) = serde_json::from_str::<IpcEvent>(&line) {
                            let raw = ipc_to_raw(ipc);
                            if let Ok(mut buf) = ring.lock() {
                                buf.push(raw);
                            }
                        }
                    }
                    eprintln!("[input_host] child exited — restarting in 1s");
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ipc_key_down_maps_to_raw() {
        let ipc = IpcEvent::KeyDown { ts: 12345, is_deletion: true };
        let raw = ipc_to_raw(ipc);
        match raw {
            RawInputEvent::KeyDown { ts_ms, is_deletion } => {
                assert_eq!(ts_ms, 12345);
                assert!(is_deletion);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn ipc_mouse_click_left_maps_correctly() {
        let ipc = IpcEvent::MouseClick { button: 0, ts: 9999 };
        let raw = ipc_to_raw(ipc);
        match raw {
            RawInputEvent::MouseClick { button: MouseButton::Left, ts_ms } => {
                assert_eq!(ts_ms, 9999);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn ipc_scroll_maps_correctly() {
        let ipc = IpcEvent::Scroll { delta_x: 0, delta_y: -3, ts: 1000 };
        let raw = ipc_to_raw(ipc);
        match raw {
            RawInputEvent::Scroll { delta_x, delta_y, ts_ms } => {
                assert_eq!(delta_x, 0);
                assert_eq!(delta_y, -3);
                assert_eq!(ts_ms, 1000);
            }
            _ => panic!("wrong variant"),
        }
    }
}
