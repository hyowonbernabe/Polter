# Wisp — Tech Stack Reference

This document covers every technology choice in Wisp, why it was chosen, what it replaces, and which build phase it belongs to.

---

## Platform Target

| Phase | Target |
|---|---|
| V1 — Hackathon | Windows only (Windows 10 / 11) |
| V2 — Post-Hackathon | Windows + macOS port |
| V3 — Future | Mobile companion (iOS / Android) |

All decisions in this document are made with V1 (Windows) as the primary constraint. Where a choice would need to change for Mac, that is noted.

---

## Desktop Shell

**Tauri 2**

Tauri is the framework that wraps the app into a native Windows executable. It provides the window, the system tray icon, the app lifecycle, and a bridge between the Rust backend and the React frontend.

| Why Tauri over the alternatives | |
|---|---|
| vs Electron | Electron bundles its own copy of Chrome — ~165 MB installer, ~180 MB idle RAM. Tauri uses the OS's built-in browser engine — ~8 MB installer, ~45 MB idle RAM. For an app that runs silently all day, this difference matters. |
| vs Flutter Desktop | Flutter compiles to native code and has excellent custom rendering, but Dart is a slower ramp for a 5-day build. Tauri lets us use React, which is faster to move in. |
| vs Qt | Correct architecture but C++ slows down a hackathon badly. |
| vs raw native (WinUI/WPF) | Windows-only from line one. Tauri gives us the same footprint with a path to Mac later. |

**Key Tauri features used:**
- `transparent: true` + `decorations: false` — borderless transparent window for the pet overlay
- `always_on_top: true` — pet stays visible on the desktop
- System tray API — background running, right-click menu
- Sidecar API — spawning child processes if needed in future phases
- Tauri commands — type-safe async bridge between Rust and React
- Tauri events — pushing real-time data from Rust to the React UI without polling

**Reference:** [WindowPet](https://github.com/SeakMengs/WindowPet) — an open-source desktop pet built on this exact Tauri + React + transparent window pattern. Proves the approach works.

---

## Backend Language

**Rust**

The Tauri backend runs in Rust. All sensor collection, signal processing, AI inference routing, and data management happen here.

Rust was not chosen for performance alone. The specific reasons for this app:

- `rdev` (keyboard/mouse hooks) is a Rust crate — no bridging layer needed
- `windows-rs` (Windows API access) is the official Microsoft Rust binding — first-class Windows integration
- `ort` (ONNX Runtime) has a mature Rust crate — on-device ML without leaving Rust
- `ollama-rs` and `openrouter-rs` are both Rust crates — the entire AI inference layer stays in one language
- Rust's ownership model makes it hard to accidentally capture sensitive data you did not intend to — important for a privacy-first app

---

## Frontend

**React + TypeScript**

The Tauri frontend is a React app rendered inside a transparent browser window. This is where the pixel art pet lives and where any dashboard or insight panels appear.

TypeScript is used throughout — no plain JavaScript.

**Why React over other frontend options:**
- Fastest iteration speed for a hackathon
- The pixel art pet renders on an HTML `<canvas>` element — no framework-specific rendering needed
- Tauri's command and event APIs have first-class TypeScript types

**Pixel art rendering:**

The pet is a sprite sheet (PNG with transparent background). CSS sets `image-rendering: pixelated` to prevent anti-aliasing when scaling up. Frame animation runs via `requestAnimationFrame` on a canvas. This is the standard approach used by browser-based desktop pets and is visually indistinguishable from Unity or Godot for 2D sprite work.

---

## Input Monitoring

**rdev** (Rust crate)

Listens to global keyboard and mouse events on Windows without requiring elevated permissions. Captures event type (key down, key up, mouse move, click, scroll) and timestamp in nanoseconds.

**What Wisp takes from rdev:**
- Timestamp of each key event (inter-keystroke interval)
- Key hold duration (time between keydown and keyup)
- Whether the event was a backspace, delete, undo, redo, save shortcut, or other special key — key identity is used only to classify these behavioral categories, then discarded
- Mouse position delta (movement distance between samples, not absolute coordinates)
- Mouse click type and frequency
- Scroll events

**What is explicitly thrown away:**
- The actual character value of any key press
- Absolute mouse coordinates

The listener runs in a dedicated Rust thread spawned at app startup, separate from the Tauri window thread. This avoids a known `rdev` issue where keyboard events stop arriving when the Tauri window has focus.

**Known limitation:** `rdev` requires no special permissions on Windows. On macOS (future), it requires Accessibility API permission — plan for a permission prompt in the V2 Mac port.

---

## System Signal Collection

**windows-rs** (Microsoft's official Rust bindings for the Windows API)

Used to read system-level state that requires no user permission and contains no personal content:

| Signal | Windows API used |
|---|---|
| CPU usage level | `PdhOpenQuery` / Performance Data Helper |
| RAM usage level | `GlobalMemoryStatusEx` |
| Battery percentage and power source | `GetSystemPowerStatus` |
| Battery drain rate | Derived from polling `GetSystemPowerStatus` over time |
| Display brightness | `WmiQuery` on `WmiMonitorBrightness` |
| Night light / blue light filter state | Registry key `HKCU\Software\Microsoft\Windows\CurrentVersion\CloudStore` |
| Open window count | `EnumWindows` |
| Active application name | `GetForegroundWindow` + `GetWindowText` (process name only, not window title) |
| Application dwell time | Derived from `GetForegroundWindow` polling |
| Audio device state (headphones, volume) | Core Audio API via `IMMDeviceEnumerator` |
| Network activity level | `GetIfTable2` (bytes in/out delta) |

All polling runs on a background Rust thread at a configurable interval (default: 1 second for input events, 5 seconds for system metrics).

---

## AI Inference

Wisp uses a **local-first, cloud-fallback** inference architecture. Every inference call routes through a single Rust function — the rest of the app does not need to know which backend is active.

### Local — Ollama + Gemma 4

**Ollama** is a free, open-source tool that runs AI models locally on the user's machine and exposes them via a REST API on `localhost:11434`. Wisp does not bundle Ollama — it detects whether it is already installed and uses it if present.

**Model: Gemma 4 26B A4B Q4_K_M**

Google's Gemma 4 family released in early 2026. The 26B A4B variant uses a Mixture-of-Experts design — 26 billion parameters total, but only ~3.8 billion activate per query. This gives near-30B quality at near-4B cost. Q4_K_M quantization compresses it by ~70% with negligible quality loss.

| Hardware tier | Experience |
|---|---|
| GPU with 18+ GB VRAM | Full quality, fast (~20–40 tokens/sec) |
| 16 GB RAM, no GPU | Runs on CPU at 3–8 tokens/sec — acceptable for background analysis |
| Under 16 GB RAM | Too slow — app falls back to OpenRouter automatically |

Fallback model: **Gemma 4 E4B Q4_K_M** — the 4B edge-optimized variant. Faster, lighter, slightly lower quality. Used as a local fallback before escalating to cloud.

**Rust integration:** `ollama-rs` crate — type-safe async client for the Ollama API. Uses `tokio` + `reqwest` underneath, consistent with Tauri's async model.

### Cloud Fallback — OpenRouter

**OpenRouter** is an API aggregator that provides access to 300+ models through a single OpenAI-compatible endpoint. Used when Ollama is not installed or the user's hardware cannot run the local model.

**Default cloud model: DeepSeek V3.2** (best quality-per-cost for reasoning tasks as of May 2026)
**Backup cloud model: Gemini 3.1 Flash** (faster, slightly lower quality)

**Privacy:** OpenRouter does not store prompts by default. Zero Data Retention is enforced per-request via the `zdr: true` parameter. However, underlying model providers have their own policies — Wisp surfaces this clearly in the UI with a "running locally" vs "using cloud" badge. The user always knows which mode is active.

**Rust integration:** `openrouter-rs` crate — type-safe async client. Raw `reqwest` is a valid fallback since OpenRouter is just HTTP.

### Inference Mode State Machine

```
App startup
  │
  ├─ Probe localhost:11434
  │    ├─ Running + model present ──────────→ LOCAL mode
  │    ├─ Running + model missing ──────────→ Offer download, use CLOUD meanwhile
  │    └─ Not running ──────────────────────→ CLOUD mode
  │
  └─ Re-probe every 60 seconds (picks up Ollama if user installs it mid-session)

CLOUD mode
  ├─ API key configured ────────────────────→ Call OpenRouter
  └─ No API key ────────────────────────────→ Show setup prompt, degrade gracefully
```

The UI always shows the current mode. The user can force a mode switch from settings.

### What the AI Actually Does

Wisp does not run inference continuously. It batches signals on a configurable interval (default: every 15 minutes, or on significant state change) and sends a structured prompt to the active inference backend.

The prompt includes: current signal readings, trends over the last hour, current time of day, day of week, and any context modifiers (calendar event proximity if enabled, headphone state, power source). The model returns a short insight — one to three sentences — and a mood score that updates the pet's expression.

The model never receives raw keystroke data. It receives computed metrics: average typing speed, jitter level, pause frequency, deletion ratio, context switch count, etc.

---

## On-Device ML — Future Use

**ONNX Runtime** (`ort` Rust crate) — not used in V1 but ready to add.

The behavioral scoring models (focus quality score, stress level, baseline drift detection) will eventually run as lightweight ONNX models bundled with the app — no Ollama dependency required for these. This separation matters: the ONNX models handle continuous real-time scoring; the LLM handles periodic insight generation.

V1 uses simple rule-based scoring to drive the pet's mood state. ONNX models are the V2 upgrade path.

---

## Data Storage

**SQLite** via the `rusqlite` crate (or `sqlx` with SQLite driver).

All signal data is stored locally on the user's machine. No cloud database. The database file lives in the OS app data directory (`%APPDATA%\Wisp\` on Windows).

Schema design priorities:
- Time-series optimized: signal readings stored as timestamped rows, not wide columns
- Append-only for raw readings — never update or delete historical data
- Aggregated summaries computed and cached separately to avoid re-scanning history on every query
- Retention policy: raw readings kept for 90 days by default, aggregates kept indefinitely. User-configurable.

---

## Project Structure

```
wisp/
├── src-tauri/              # Rust backend (Tauri)
│    ├── src/
│    │    ├── main.rs           # App entry, Tauri builder
│    │    ├── sensors/          # Input and system signal collectors
│    │    │    ├── keyboard.rs      # rdev listener, keystroke dynamics
│    │    │    ├── mouse.rs         # rdev listener, mouse behavior
│    │    │    └── system.rs        # windows-rs system metrics
│    │    ├── inference/        # AI inference layer
│    │    │    ├── mod.rs           # Route to local or cloud
│    │    │    ├── local.rs         # ollama-rs integration
│    │    │    └── cloud.rs         # openrouter-rs integration
│    │    ├── scoring/          # Signal aggregation and scoring
│    │    │    └── mod.rs           # Focus score, stress level, baseline
│    │    ├── storage/          # SQLite read/write
│    │    │    └── mod.rs
│    │    └── commands.rs       # Tauri commands exposed to frontend
│    └── Cargo.toml
├── src/                    # React + TypeScript frontend
│    ├── components/
│    │    ├── Pet/               # Pixel art pet canvas and animation
│    │    ├── Dashboard/         # Insight panel (shown on click/hover)
│    │    └── StatusBar/         # Local vs cloud badge, sensor indicators
│    ├── hooks/                  # Tauri event listeners, state management
│    └── App.tsx
├── assets/
│    └── sprites/            # Pixel art sprite sheets (PNG)
└── tauri.conf.json         # Tauri config (transparent window, tray, etc.)
```

---

## Key Dependencies

| Crate / Package | Version | Purpose |
|---|---|---|
| `tauri` | 2.x | Desktop shell, window management, system tray |
| `rdev` | latest | Global keyboard and mouse event hooks |
| `windows` (windows-rs) | latest | Windows API — system metrics, display, audio |
| `ollama-rs` | latest | Local AI inference via Ollama |
| `openrouter-rs` | latest | Cloud AI inference via OpenRouter |
| `rusqlite` or `sqlx` | latest | Local SQLite database |
| `tokio` | 1.x | Async runtime (required by Tauri and most crates) |
| `reqwest` | latest | HTTP client (used by inference crates) |
| `serde` + `serde_json` | latest | Serialization for IPC and storage |
| `ort` | latest | ONNX Runtime — deferred to V2 |
| React | 18.x | Frontend framework |
| TypeScript | 5.x | Type safety across the frontend |

---

## What is Explicitly NOT in the Stack

| Excluded | Why |
|---|---|
| Electron | ~4x the RAM footprint of Tauri for no benefit in this use case |
| Python sidecar | Was needed for rPPG (yarppg). rPPG is deferred, so Python is gone entirely |
| Microphone access (V1) | Deferred to V3 — `cpal` Rust crate is the plan when ready |
| Webcam / rPPG (V1) | Deferred to V2 — yarppg + MediaPipe is the plan when ready |
| ONNX Runtime (V1) | Deferred to V2 — rule-based scoring is sufficient for the hackathon |
| Any cloud database | Everything is local. No server. No account required to use Wisp. |
| Unity / Godot | Correct for a pure game/pet, overkill here — canvas handles 2D sprites fine |

---

## Build and Development

**Prerequisites for development:**
- Rust (via rustup) — latest stable
- Node.js 20+ — for the React frontend
- Tauri CLI (`cargo install tauri-cli`)
- Ollama installed locally (optional — app degrades gracefully without it)

**Dev commands:**
```
cargo tauri dev          # Start app in development mode with hot reload
cargo tauri build        # Build production .msi installer for Windows
```

---

## Mac Port Notes (V2)

When the Mac port is built, the following changes are required:

| Component | Windows | macOS change needed |
|---|---|---|
| Input hooks (rdev) | Works with no permissions | Requires Accessibility API permission prompt |
| System metrics | `windows-rs` | Replace with `core-foundation` / `IOKit` / `sysinfo` crate |
| Display brightness | Windows WMI | `IODisplayConnect` via `core-foundation` |
| Audio device state | Core Audio (Windows) | Core Audio (macOS) — same API, different entry points |
| Night light state | Registry key | `CoreBrightness` private framework or `NSUserDefaults` |
| App name detection | `GetForegroundWindow` | `NSWorkspace.shared.frontmostApplication` via objc crate |

The `sysinfo` crate (cross-platform system info in Rust) covers most of these and may simplify the Mac port significantly. Worth evaluating at V2 start.
