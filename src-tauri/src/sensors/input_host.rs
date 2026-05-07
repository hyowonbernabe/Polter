use crate::pipeline::ring_buffer::{MouseButton, RawInputEvent, RingBuffer};
use serde::Deserialize;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum IpcEvent {
    KeyDown {
        ts: u64,
        is_deletion: bool,
        #[serde(default)]
        is_undo: bool,
        #[serde(default)]
        is_redo: bool,
        #[serde(default)]
        is_save: bool,
    },
    KeyHold { ts: u64, hold_ms: u64 },
    KeyUp { ts: u64 },
    MouseMove { x: f64, y: f64, ts: u64 },
    MouseClick { button: u8, ts: u64 },
    Scroll { delta_x: i64, delta_y: i64, ts: u64 },
}

fn monitor_binary_path() -> PathBuf {
    #[cfg(debug_assertions)]
    {
        if let Some(target_dir) = option_env!("CARGO_TARGET_DIR") {
            PathBuf::from(target_dir).join("debug/input-monitor.exe")
        } else {
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("target/debug/input-monitor.exe")
        }
    }
    #[cfg(not(debug_assertions))]
    {
        // Tauri externalBin sidecar: placed next to the main exe with a target-triple suffix.
        // Resolve by checking sidecar name first, then bare name as fallback.
        let exe_dir = std::env::current_exe()
            .unwrap()
            .parent()
            .unwrap()
            .to_path_buf();
        let sidecar = exe_dir.join("input-monitor-x86_64-pc-windows-msvc.exe");
        if sidecar.exists() {
            sidecar
        } else {
            exe_dir.join("input-monitor.exe")
        }
    }
}

fn ipc_to_raw(ipc: IpcEvent) -> RawInputEvent {
    match ipc {
        IpcEvent::KeyDown { ts, is_deletion, is_undo, is_redo, is_save } => {
            RawInputEvent::KeyDown { ts_ms: ts, is_deletion, is_undo, is_redo, is_save }
        }
        IpcEvent::KeyHold { ts, hold_ms } => {
            RawInputEvent::KeyHold { ts_ms: ts, duration_ms: hold_ms }
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
    tauri::async_runtime::spawn(async move {
        let path = monitor_binary_path();
        loop {
            #[allow(unused_mut)]
            let mut cmd = Command::new(&path);
            cmd.stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::null())
                .kill_on_drop(true);
            // Hide the console window on Windows
            #[cfg(target_os = "windows")]
            {
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                cmd.creation_flags(CREATE_NO_WINDOW);
            }
            match cmd
                .spawn()
            {
                Err(e) => {
                    tracing::error!("[input_host] failed to spawn {path:?}: {e}");
                    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                }
                Ok(mut child) => {
                    let stdout = child.stdout.take().unwrap();
                    let mut reader = BufReader::new(stdout).lines();
                    while let Ok(Some(line)) = reader.next_line().await {
                        if let Ok(ipc) = serde_json::from_str::<IpcEvent>(&line) {
                            // KeyUp events are replaced by KeyHold (which carries
                            // duration). Drop bare KeyUp to preserve ring buffer capacity.
                            if matches!(ipc, IpcEvent::KeyUp { .. }) {
                                continue;
                            }
                            let raw = ipc_to_raw(ipc);
                            if let Ok(mut buf) = ring.lock() {
                                buf.push(raw);
                            }
                        }
                    }
                    tracing::warn!("[input_host] child exited — restarting in 1s");
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
        let ipc = IpcEvent::KeyDown { ts: 12345, is_deletion: true, is_undo: false, is_redo: false, is_save: false };
        let raw = ipc_to_raw(ipc);
        match raw {
            RawInputEvent::KeyDown { ts_ms, is_deletion, .. } => {
                assert_eq!(ts_ms, 12345);
                assert!(is_deletion);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn ipc_key_hold_maps_to_raw() {
        let ipc = IpcEvent::KeyHold { ts: 5000, hold_ms: 120 };
        let raw = ipc_to_raw(ipc);
        match raw {
            RawInputEvent::KeyHold { ts_ms, duration_ms } => {
                assert_eq!(ts_ms, 5000);
                assert_eq!(duration_ms, 120);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn ipc_key_down_undo_flag() {
        let ipc = IpcEvent::KeyDown { ts: 100, is_deletion: false, is_undo: true, is_redo: false, is_save: false };
        let raw = ipc_to_raw(ipc);
        match raw {
            RawInputEvent::KeyDown { is_undo, is_redo, is_save, .. } => {
                assert!(is_undo);
                assert!(!is_redo);
                assert!(!is_save);
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
