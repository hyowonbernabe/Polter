# Wisp — Architecture Reference

Wisp is a passive desktop companion for Windows. A pixel art creature (a winged ball) lives as a transparent, always-on-top overlay. It silently watches your keyboard, mouse, and system behavior, builds a personal baseline of your normal patterns over time, classifies your current mental state using a rule-based engine, and occasionally shows AI-generated psychological observations through chat bubbles that appear to come from the creature — like a small, silent presence that notices things about you.

This document covers every architectural decision made for Wisp, organized by layer.

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| App shell | Tauri 2 (Rust backend + React/TypeScript frontend) | Native Windows performance, small binary, Rust safety for low-level hooks |
| Input capture | rdevin (Rust), run in a separate child process | rdev fork actively maintained; rdev itself has a confirmed Tauri 2 bug where keyboard events drop when the Tauri window has focus — running in a side process avoids this entirely |
| System signals | windows-rs | Direct Windows API access from Rust |
| AI inference | OpenRouter (demo) → Ollama (polish) | OpenRouter for quick setup; Ollama for fully local, private inference |
| Storage | SQLite | Single-file, zero-config, well-suited to time-series behavioral data |
| Settings | Tauri store plugin | Key-value store separate from SQLite |
| API key storage | keyring crate | Wraps Windows Credential Manager on Windows, macOS Keychain on macOS — safe Rust, cross-platform, no unsafe code required |
| Sprite rendering | HTML canvas (`image-rendering: pixelated`) | Preserves sharp pixel art at any scale |
| Audio | Web Audio API, bundled audio files | Fully offline — no network dependency, no external assets |
| Updater | Tauri updater plugin + GitHub Releases | Manifest hosted on GitHub Releases; user prompted on available update |

---

## Layer 1 — Data Collection

### Keyboard and Mouse Capture

Input is captured purely through events — there is no polling loop. The operating system fires an event on every keypress and every mouse action; rdevin catches each one.

**Why rdevin, not rdev:** rdev has a confirmed bug in Tauri 2 on Windows where keyboard events stop firing whenever the Tauri window holds focus. rdevin is an actively maintained fork that fixes this. Additionally, the input listener runs in a **separate child process** (spawned via `std::process::Command`), not inside the Tauri process. This isolation prevents the focus-driven event drop entirely, regardless of which crate is used. The child process communicates events back to the main process via stdin/stdout.

**What is recorded per event:**

| Event type | Captured | Never captured |
|---|---|---|
| Key press | Timestamp when key went down, timestamp when key came up | Which key was pressed, any text content |
| Mouse move | Position (x, y) + timestamp | — |
| Mouse click | Click type (left/right/middle) + timestamp | — |

Raw events are held in an **in-memory ring buffer** only. Every 60 seconds, the app computes a summary of what happened (typing speed, pause patterns, mouse behavior) and writes one compact record to SQLite. All raw events are then discarded. Raw input never touches storage at any point.

### System Signals

Polled every 30 seconds via windows-rs. One snapshot written to SQLite per poll.

**Signals captured:**
- Battery level and power source (plugged in vs. on battery)
- CPU load average
- RAM currently in use
- Display brightness
- Audio device state (headphones vs. speakers)
- Number of open windows

### Defining "Active"

A user is considered present and active when there is at least one mouse movement event per minute on average over any 5-minute window. Keyboard activity enriches the quality of observations but is not required to confirm presence — mouse movement alone is enough.

### Session Boundaries

A session ends when any of these occurs:

- **10 minutes of zero input** — no keyboard or mouse events
- **Manual sleep** — user puts the machine to sleep, session ends immediately regardless of inactivity timer
- **System wake** — when a laptop lid opens or the machine wakes from hibernation, the current session closes and a new one starts fresh

### Self-Throttling

Performance throttling (CPU/memory caps) is deferred. The plan is to build first, measure under real conditions, and set thresholds from actual profiled data rather than guessing upfront.

---

## Layer 2 — Baseline and State Classification

### Personal Baseline

Wisp learns what "normal" looks like for each user individually. It uses an **Exponential Moving Average (EMA)** with a 14-day decay window — recent behavior counts for more, and data older than roughly 6 weeks becomes nearly irrelevant.

The baseline is updated once per day, at the end of the last session of the day.

**Reliability guard:** The EMA baseline requires at minimum 30 days of data before it is statistically reliable. During the first 30 days, cold-start mode remains active and anomaly detection is suppressed — only the state classifier runs (using population-level defaults). At day 30, the system switches silently to the personal baseline.

Baselines are **segmented by time-of-day bucket and day-of-week**. Tuesday afternoon behavior is tracked and compared separately from Monday morning behavior. This means the thresholds for "typing faster than normal" adjust for your actual patterns at that time, not a flat average across your entire history.

### Cold Start (First 7 Days)

No personal baseline exists yet during the first week.

- The creature shows a "still learning" visual state
- The state machine runs using population-level defaults as a temporary stand-in
- No insights or bubbles are generated during this period
- After 7 days, the app silently switches to the personal baseline
- The very first insight ever shown gets special treatment: a longer pre-glow, a deeper bloom animation (see Layer 6)

### The 7 States

All thresholds are relative — they measure deviation from the user's personal baseline, not absolute values. A "fast" typing speed means fast *for you*, not fast in general.

| State | What the behavior looks like |
|---|---|
| **focus** | Typing near your normal pace, low app switching, calm mouse movement |
| **calm** | Typing slower than your baseline, few keystrokes, relaxed mouse |
| **deep** | One window held for an extended time, very low switching, rhythmic typing |
| **spark** | Typing significantly faster than your baseline, more errors, rapid mouse movement |
| **burn** | Spark-level signals sustained for 45+ minutes, error rate still climbing |
| **fade** | Typing slower than baseline AND error rate rising, long pauses between bursts |
| **rest** | Near-zero input, but session is technically still open |

**Seven signals feed the classifier:**

1. Typing speed vs. baseline
2. Error rate (measured by backspace frequency) vs. baseline
3. App-switch rate
4. Mouse speed
5. Mouse jitter
6. Pause frequency
7. Single-window hold duration

### State Transition Debounce

A signal must remain in a new threshold range for **3 continuous minutes** before the state actually commits. If the signal drifts back during that 3-minute window, the timer resets from zero.

Transitions can only move in one direction at a time — no simultaneous multi-state evaluation. This prevents the creature from visually flickering when signals are ambiguous or briefly noisy.

### Daily Summaries

Sessions are tracked separately internally (accurate per-session state history, longest focus block per session). The dashboard rolls up to a daily view: total active time, and minutes spent in focus / deep / burn states.

A `daily_summaries` table is pre-aggregated at session end. Dashboard queries hit this pre-built table — they never run aggregations over raw snapshots.

### Anomaly Detection

An anomaly is declared when a signal falls outside the **95th percentile bounds** (equivalent to 1.96 standard deviations under a normal distribution) of the personal baseline for that specific time-of-day and day-of-week bucket, and the deviation persists for at least **5 continuous minutes**.

Behavioral metrics such as keystroke timing and session length are right-skewed distributions — a fixed 2.5 SD threshold on raw values would systematically over-flag on one tail. Metrics are log-transformed before percentile comparison to correct for skew. 1.96 SD (95th percentile) is the standard threshold from the keystroke dynamics research literature (Killourhy & Maxion).

The same anomaly type cannot trigger more than once within a **2-hour window**.

---

## Layer 3 — AI Inference Pipeline

### Inference Stack

| Mode | How it works | When used |
|---|---|---|
| OpenRouter | Paste an API key, works immediately over the internet. Default model: DeepSeek V4 Flash or Gemini 2.5 Flash-Lite (low latency, low cost). Model is a configurable string — swappable without a release. | Hackathon / demo |
| Ollama | Fully on-device, no internet, no cost | Polish / privacy-focused build |
| No-AI mode | Creature still runs and reflects state, no bubbles generated | API key absent or Ollama unavailable |

Inference mode is re-checked every 60 seconds.

### What Triggers an Inference Call

Three triggers, evaluated in priority order:

1. **State transition** — after the 3-minute debounce confirms a new state
2. **Behavioral anomaly** — 2.5 SD deviation, persisted for 5 minutes
3. **Time floor fallback** — if neither trigger above has fired in the last 90 minutes on an active day

### Guards Before Firing

All of the following must be true before an inference call is made:

- At least 5 minutes of active behavioral data exists in the current session
- The daily hard cap of **3 insights** has not been reached
- Deduplication check passes (see below)
- Not in sleep mode or privacy mode
- Not in a fullscreen context on all monitors (see Fullscreen Handling in Layer 6)

### What Gets Sent to the AI

**System prompt** (sent once per session):
- Wisp's voice rules: lowercase, second person, observational, never prescriptive, no "you should", no health claims
- The 7 state definitions
- Output JSON schema
- Hard rules on insight quality

**User message** (per call, under 300 words):
- Current state and how long it has been active
- Key signal deviations from baseline, described in plain language (e.g., "typing speed 35% above your normal pace")
- Recent state history (last 60 minutes)
- Time of day and day of week
- Relevant long-term patterns if applicable
- How many times this insight type has appeared in the last 48 hours (so the AI can frame repeats differently)

### Output Schema

```json
{
  "state": "burn",
  "insight": "one to two sentence bubble text in Wisp's voice",
  "extended": "two to three sentence expansion for tell me more",
  "type": "fatigue_signal"
}
```

**Valid insight types:**

| Type | What it represents |
|---|---|
| `flow_detection` | User is in a deep focus or flow state |
| `fatigue_signal` | Signs of mental exhaustion |
| `pattern_revelation` | A longer-term behavioral pattern identified |
| `avoidance_detection` | Signals suggesting task avoidance |
| `peak_performance` | Unusually high quality or productive session |
| `stress_tell` | Behavioral stress markers |
| `anomaly` | Significant deviation from baseline |
| `break_signal` | User should consider stepping away |
| `comparative` | Today compared to a similar recent day |
| `returning_user` | User returning after a long absence |

### Malformed Response Handling

All inference calls have a **10-second timeout**. If the response fails, times out, or returns invalid JSON: log the error silently, discard the call, do not crash, do not show a broken bubble. The next trigger fires naturally.

### Deduplication

The last 10 insight types are tracked with timestamps and occurrence counts in SQLite. The same insight type is handled differently based on how often it has fired in the last 48 hours:

| Occurrence in 48h | Behavior |
|---|---|
| 1st | Normal insight shown |
| 2nd | Follow-up framing — repeat count passed to AI, which frames it as "again…" |
| 3rd | Stronger follow-up framing — "this keeps happening…" |
| 4th+ | Fully suppressed — no API call made |

**Exceptions:**
- `anomaly` type always surfaces, regardless of deduplication count
- `pattern_revelation` resets the clock if the underlying pattern has meaningfully changed

### Cost Guardrails

- Daily call counter stops firing once the 3-insight cap is hit
- Each call is estimated at ~1,800 tokens (1,500 in + 300 out)
- At DeepSeek V3.2 pricing: ~$0.0015 per user per day maximum

---

## Layer 4 — Storage

### Database

SQLite, single file at `%APPDATA%\Wisp\wisp.db`.

**V1 has no encryption.** Behavioral metadata (typing rhythm, mouse speed) has no sensitive content. The Windows user account boundary prevents other accounts from reading the file. DPAPI encryption is planned for V2.

SQLite runs in **WAL mode** (Write-Ahead Logging), which allows concurrent reads during a write and prevents database corruption from partial writes or crashes. Additional pragmas: `synchronous=NORMAL` (crash-safe without full-sync overhead) and `busy_timeout=5000` (prevents "database is locked" errors under contention).

**Connection pool pattern:** use separate read and write connection pools. Write pool: 1 connection (SQLite only supports one writer). Read pool: N connections. This prevents write transactions from blocking readers.

### Schema

| Table | One row per | Key columns |
|---|---|---|
| `behavioral_snapshots` | 60-second feature window | `session_id`, `timestamp`, `typing_speed_ratio`, `error_rate_ratio`, `app_switch_rate`, `mouse_speed_ratio`, `mouse_jitter_ratio`, `pause_frequency`, `single_window_hold_duration`, plus all system signal columns |
| `sessions` | Session | `start_time`, `end_time`, `state_summary` |
| `daily_summaries` | Day | `total_active_minutes`, `focus_minutes`, `deep_minutes`, `burn_minutes`, `longest_focus_block`, states breakdown. Written at session end. |
| `insights` | Generated insight | `timestamp`, `state`, `insight_text`, `extended_text`, `type`, `shown` (bool), `dismissed_at` |
| `insight_dedup_log` | Insight type occurrence | `type`, `timestamp`, `occurrence_count` per 48h window |
| `baseline` | Per-signal EMA value | Segmented by `time_of_day_bucket` and `day_of_week` |

### Settings Storage

Tauri store plugin handles key-value settings, stored in a separate file from SQLite. The OpenRouter API key is stored in **Windows Credential Manager** via windows-rs — it never appears in the store file or any file on disk.

### Data Directory

All files written to `%APPDATA%\Wisp\`. This directory is isolated per Windows user account automatically. Nothing is ever written to `%ProgramData%` or any shared system location.

### Retention

| Data | Kept for |
|---|---|
| Raw behavioral snapshots | 30 days |
| Daily summaries | 1 year |
| Insight history | Indefinitely |

---

## Layer 5 — Startup, Lifecycle, and Resilience

### Single Instance Enforcement

Single-instance enforcement uses `tauri-plugin-single-instance` (official Tauri plugin). It must be registered first in the plugin chain before any other plugins.

- If no instance is running: normal startup proceeds
- If an instance is already running: the plugin passes the launch arguments to the running instance and exits the new launch silently
- The running instance receives a callback and surfaces the creature if it was hidden

### First Launch vs. Returning Launch

On every launch, Wisp checks the `onboarding_completed` flag in the Tauri store.

- Missing or false → run onboarding flow
- True → normal startup sequence

### Startup Sequence

Steps execute in this order:

1. Load settings from Tauri store
2. Load personal baseline and state history from SQLite
3. Probe Ollama / OpenRouter availability (runs in background, does not block startup)
4. Start sensor threads (rdev listeners + system signal poller)
5. Render creature window — appears immediately at last known position and state
6. Begin state classification
7. Resume insight generation eligibility (the 5-minute active floor starts counting)

### Failure Handling at Startup

| What fails | What happens |
|---|---|
| Settings missing | Use defaults |
| Baseline missing | Enter cold start mode |
| SQLite unreadable | Log error, run without history, attempt recovery on next launch |
| Sensors fail to start | Show quiet tray indicator, retry every 60 seconds |

### System Wake Handling

Wisp listens for Windows power events via windows-rs.

- On wake: close the current session, reset the state machine, start fresh
- If the machine was asleep for **4+ hours**: trigger the "returning user" animation on the creature

### Resilience Per Failure Domain

| Failure | Response |
|---|---|
| rdev drops events | Sensor thread checks every 30 seconds for event arrival. If none arrive during an active session for 30 seconds, silently restart the rdev listener. |
| Ollama crashes | 10-second timeout, mark as unavailable, re-probe every 60 seconds |
| SQLite write fails | Hold snapshot in memory, retry once. If retry fails, discard — one lost 60-second window is acceptable. WAL mode prevents corruption. |
| OpenRouter 429 or 500 | Discard the triggered insight, back off for 5 minutes |

### Updates

Tauri updater plugin checks GitHub Releases on every launch. The update manifest is a JSON file hosted on GitHub Releases. The user is prompted when an update is available.

Use `tauri-action` in GitHub Actions to generate the `latest.json` manifest automatically on release. Critical gotchas: (1) the `signature` field in the manifest must be the raw content of the `.sig` file, not a path or URL — this is a common first-time mistake; (2) store the signing private key in GitHub Secrets immediately — if it is lost, users on old versions cannot receive future updates.

---

## Layer 6 — UI, Overlay, and Creature

### Window Configuration

| Property | Value |
|---|---|
| Background | Transparent |
| Border | None |
| Always on top | Yes |
| Default cursor behavior | Click-through (`ignore_cursor_events: true`) |
| Exceptions to click-through | Creature sprite bounds; bubble panel bounds when visible |

**Per-region click-through implementation:** Tauri 2's `setIgnoreCursorEvents()` is global only — it cannot be restricted to a specific region natively. The correct implementation is a Rust async task polling at ~60fps that checks the current cursor position against the known bounds of interactive regions (creature sprite, bubble panel). When the cursor is inside a region, it calls `window.set_ignore_cursor_events(false)`; when outside, `window.set_ignore_cursor_events(true)`. The Rust polling loop is compiled and has negligible CPU cost. Panel bounds are passed to Rust via a Tauri command whenever the creature moves or a bubble opens.

Hit-test regions are updated every time the creature's position changes.

### Creature Positioning

Position is saved as a **percentage of the monitor's work area dimensions**, not raw pixel coordinates. On launch, the percentage is converted back to pixels for the current screen dimensions.

Rules:
- Creature is always clamped to a safe zone — it can never be partially off-screen
- Work area is used everywhere (not full screen dimensions) — the taskbar and side docks are always respected
- If the saved monitor no longer exists: fall back to the primary monitor's bottom-right corner
- The creature can live on any connected monitor and be dragged between them freely

### Multi-Monitor

- The creature's home monitor is tracked by index
- Dragging past a monitor edge moves the creature to the next monitor seamlessly
- The new monitor becomes home; position is saved as a percentage of that monitor's work area
- DPI scaling is handled per-monitor — the creature re-renders at the correct DPI when crossing a monitor boundary

### Screen Edge Snapping

- 20-pixel snap zone along all work area edges and corners
- Only activates during intentional drag — not during throws or idle drift
- Creature snaps flush to the edge with a small settle/lean animation
- Corner snap triggers if within 20px of both edges at the same time

### Sprite Animation System

| Property | Value |
|---|---|
| Renderer | HTML canvas |
| Scaling | `image-rendering: pixelated` |
| Frame rate | 12fps (intentionally chunky pixel art feel) |
| Sheet format | Horizontal strip of frames per state |
| Canvas size | Fixed at source pixel dimensions; scaled up via CSS `transform: scale()` — never stretch the canvas element itself |
| Animation loop | `requestAnimationFrame` with elapsed-time throttle (update only when ≥83ms has passed since last frame) — not `setInterval` |

**Frame counts per state:**

| States | Frames |
|---|---|
| rest | 4 |
| Breathing states (calm, focus, deep, fade) | 6–8 |
| High-energy states (spark, burn) | 8–10 |

**State transitions:** The outgoing sprite sheet fades from 1 to 0, the incoming sheet fades from 0 to 1, both drawn simultaneously on the canvas over 300ms. The outgoing sheet is dropped after the crossfade completes.

### Creature Physics

| Parameter | Value |
|---|---|
| Release velocity source | Last 3 cursor positions |
| Friction | 0.85 per frame (loses 15% speed each frame) |
| Boundary bounce | 40% of incoming speed |
| Landing threshold | Velocity below 2px/frame |

Landing triggers a bounce animation that scales with impact speed.

### Idle Behavior

- After 5 minutes of complete inactivity: slow drift of 10–20px in a gentle arc, settles back
- In **rest** state: grounded, no drift, wings folded, breathing minimal
- Dims to the configured idle opacity during inactivity; sharpens back to full opacity when activity resumes

### Launch Animation

Two variants:

| Variant | Phases | Triggers |
|---|---|---|
| Full | Wind-up (200ms): squish ~10%, wings spread. Then launch (150ms): pop upward 15–20px ease-out, float back ease-in with landing bounce | Wake from sleep, rest→active transition, pre-insight |
| Light (pop only, no wind-up) | Pop only | calm/fade→spark/focus transition |

### Pre-Insight Glow Sequence

Before every bubble, the creature plays a three-phase glow sequence:

| Phase | Duration | What happens |
|---|---|---|
| 1 — Awareness | 600ms | Glow intensifies to 150%, breathing slows, wings raise slightly |
| 2 — Pulse | 800ms | Glow expands outward and fades back once, creature holds still |
| 3 — Bloom | 600ms | Bubble blooms in, glow returns to normal, creature gives a small nod. Audio chime plays here. |

**First-ever insight:** Phase 1 extends to 1.5s, the pulse happens twice, glow reaches 200%.

### Sleep and Privacy Mode

Both modes render the creature in full grayscale — no color, indicating nothing is being captured.

| Property | Sleep | Privacy Mode |
|---|---|---|
| How it starts | Manually triggered or scheduled (quiet hours) | Manually triggered only |
| How it ends | Automatically on schedule, or manual wake | Manually ended only — no timer |
| Data collection | Paused immediately | Paused immediately |
| Tray label | "Wake Wisp" | "Resume" |
| Access | System tray only — no keyboard shortcut | System tray only — no keyboard shortcut |

Both modes immediately end the current session. No audio plays in either mode.

### Fullscreen and Do Not Disturb Handling

Before showing any bubble, Wisp checks whether the foreground window is fullscreen.

| Scenario | Behavior |
|---|---|
| Fullscreen on one monitor, other monitors free | Migrate creature to a free monitor, show bubble there |
| All monitors occupied by fullscreen | Queue the insight |
| Queued insight when fullscreen ends | Show if generated within last 30 minutes; otherwise move silently to insight history |
| Focus Assist / Do Not Disturb | Opt-in setting, off by default. When enabled, queues insights during DND the same as fullscreen. |

### Bubble Positioning

Bubbles always open **toward the screen center**, away from the nearest edges. The correct quadrant is determined by the creature's current position:

| Creature location | Bubble opens |
|---|---|
| Bottom-right | Up-left |
| Bottom-left | Up-right |
| Top-right | Down-left |
| Top-left | Down-right |
| Near center | Upward (default) |

After quadrant selection, a safety check verifies the full bubble rectangle fits within the work area and shifts it if needed, while keeping the bubble tail pointed at the creature. The tail rotates to always point back at the creature's position.

### Tray Menu

```
● Wisp — [state] ([duration])     ← current state, read-only
─────────────────────────────
  Open Dashboard
  Sleep                            ← label becomes "Wake Wisp" when asleep
  Privacy Mode                     ← label becomes "Resume" when active
─────────────────────────────
  Settings
  Launch at Startup ✓              ← inline checkmark toggle
─────────────────────────────
  Quit Wisp
```

### Audio

| Property | Value |
|---|---|
| Engine | Web Audio API |
| Files | Bundled with app — fully offline |
| Default state | On (opt-out) |
| V1 behavior | Single chime on bubble appearance, plays at Phase 3 of the pre-glow sequence |
| V2 plan | Full sound effects across all creature interactions and state changes |
| During sleep or privacy mode | Silent — no audio |

**Loading bundled audio in Tauri production builds:** standard relative paths and `file://` URLs do not work in Tauri release builds. Use `resolveResource()` from `@tauri-apps/api/path` to get the correct path, then `convertFileSrc()` from `@tauri-apps/api/core` to convert it to an `asset://` protocol URL that WebView2 can load. Add `media-src asset: 'self'` to the Content Security Policy config. Always test audio in a production build — the dev server serves files differently and masks these issues.

### Rust-to-React Communication

Tauri's built-in event system (emit/listen bridge) carries all communication between the Rust backend and the React frontend.

The Rust backend emits named events with JSON payloads. React registers listeners on mount and updates creature and UI state accordingly.

**Named events:**

| Event | When fired |
|---|---|
| `state_changed` | State machine commits a new state |
| `insight_ready` | Inference pipeline has a valid insight to show |
| `inference_mode_changed` | Ollama/OpenRouter availability changes |
| `session_started` | A new session begins |
| `session_ended` | A session closes |
| `sleep_toggled` | Sleep mode turns on or off |
| `privacy_toggled` | Privacy mode turns on or off |
