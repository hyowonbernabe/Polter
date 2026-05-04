# Wisp — Roadmap

A feature-by-feature build guide. This is not an implementation plan — it describes what gets built and in what order, not how. Check off each item as it is completed.

Progress is tracked by group. A group is not "done" until every item in it is checked.

---

## Group 1 — Foundation
*The app exists as a real thing on the desktop.*

- [x] Tauri project scaffolded — Rust backend, React frontend, builds and runs
- [x] Transparent borderless window renders on screen
- [x] Window is always on top of other applications
- [x] System tray icon appears — bare minimum: icon and Quit
- [x] App launches at Windows startup automatically
- [x] Single instance enforced — second launch brings existing instance to front
- [x] Rust-to-React bridge confirmed working — at least one event fires from backend to frontend
- [x] Single static sprite renders on canvas at correct scale — fixed canvas size, CSS scale
- [x] Creature position saved as percentage of work area, restored on next launch
- [x] Click-through working — Rust polling loop passes clicks through transparent areas, captures on sprite

---

## Group 2 — Data Pipeline
*The app observes.*

- [x] rdevin input-monitor child process spawns and communicates via stdin/stdout
- [x] Keyboard events captured — timing metadata only (key-down and key-up timestamps), no content ever recorded
- [x] Mouse events captured — movement, clicks, scroll
- [ ] System signals collected — CPU, RAM, battery level, power source, display brightness, open window count, audio device state *(CPU, RAM, battery, power source, window count, foreground app done; display brightness and audio device state deferred — complex platform APIs, low priority for V1)*
- [x] Windows power events listened to — system sleep and wake detected
- [x] Raw events held in ring buffer — never written to disk
- [x] Raw events aggregated into 60-second computed feature snapshots
- [x] SQLite database created and schema defined — WAL mode, separate read/write pools
- [x] Computed feature snapshots written to database — raw events discarded after aggregation
- [x] Session boundaries correctly detected — 10-minute inactivity, manual sleep, system wake
- [x] State history log written per session — required later by the dashboard
- [x] Settings persistence layer in place — Windows Credential Manager for API key, Tauri store plugin for preferences
- [x] Resource usage verified acceptable — CPU and RAM footprint confirmed within target under sustained use *(dev mode: 47.3 MB RAM, ~4% CPU including 60fps click-through loop; release mode will be lower with LTO)*

---

## Group 3 — Baseline and State Machine
*The app understands what it is seeing.*

- [x] Cold start mode active — app flags no personal baseline exists yet, uses population-level defaults for first 30 days
- [x] Anomaly detection suppressed during cold start period
- [x] Personal baseline builds from accumulated snapshots — EMA with 14-day decay, segmented by time-of-day and day-of-week
- [x] Baseline updates once daily at end of last session
- [x] Silent switch from population defaults to personal baseline at day 30
- [x] Rule-based state classifier runs — 7 states derived from relative deviation from personal baseline
- [x] State transition debounce — 3-minute dwell required before state commits, timer resets on drift
- [x] Anomaly detection — 1.96 SD on log-transformed metrics, sustained 5 minutes, 2-hour cooldown per type
- [x] Daily summaries pre-aggregated at session end into daily_summaries table

---

## Group 4 — Creature Comes Alive
*The core product loop is complete. The creature reflects real behavior.*

- [x] All 7 sprite states render and are wired to state machine output
- [x] Breathing animation runs continuously
- [x] State transitions crossfade — no snapping between states
- [x] Glow and bloom effect renders and matches current state color
- [x] Creature dims during idle periods and sharpens when activity resumes
- [x] "Still learning" visual — distinct appearance shown during cold start period
- [x] Returning user animation — creature reacts when user comes back after a long absence
- [x] Extended burn distress — creature shows visible strain after 90+ consecutive minutes in burn state
- [x] Best session recognition — creature briefly brightens when a personal focus record is broken
- [x] System tray icon color reflects current creature state
- [x] System tray tooltip shows current state label on hover

---

## Group 5 — Core Controls
*The app can be paused. Always.*

- [x] Sleep mode — toggling sleep pauses all data collection and changes creature visual
- [x] Wake animation — creature unfurls and resumes when woken from sleep
- [x] Privacy mode — instant full pause distinct from sleep, creature shows a dedicated paused visual
- [x] Sleep and privacy mode accessible from system tray menu
- [x] Auto-sleep schedule — user can set quiet hours during which Wisp sleeps automatically

---

## Group 6 — AI Inference
*The app has something to say.*

- [ ] Ollama detected on startup — app checks whether it is running locally
- [ ] Local inference working — app sends a prompt to Ollama and receives a valid response
- [ ] OpenRouter integration working — app falls back to cloud when Ollama is unavailable
- [ ] Inference mode state tracked — local, cloud, or unavailable — re-checked every 60 seconds
- [ ] Inference trigger logic — fires on behavioral state change and on a time floor, never on less than 5 minutes of active data
- [ ] Prompt construction — behavioral features described in natural language, not raw numbers
- [ ] Response parsed and validated — state label and insight text extracted from structured output
- [ ] Malformed or failed responses handled gracefully — no crash, no data loss
- [ ] Cloud inference consent — user is informed the first time behavioral data leaves the device via OpenRouter
- [ ] No-AI indicator visible — when inference is unavailable, this is clearly communicated on hover and in tray

---

## Group 7 — Chat Bubbles
*The app speaks.*

- [ ] Bubble UI component renders — frosted glass panel with a directional tail pointing at the creature
- [ ] Bubble positioning is intelligent — appears on whichever side has more screen space, never clips off screen
- [ ] Creature glows and pulses before a bubble appears — a visible tell that it is about to speak
- [ ] Bubble blooms in with animation
- [ ] Bubble auto-dismisses after 45 seconds if not interacted with
- [ ] "Tell me more" expands the bubble — extended text is pre-generated, not a second API call
- [ ] "Ok" dismisses the bubble — creature gives a small nod
- [ ] Bubble queue — only one bubble shows at a time, others wait
- [ ] Stale insights discarded — bubbles generated during long AFK periods are dropped if no longer relevant on return
- [ ] Flow detection insight type working
- [ ] Fatigue signal insight type working
- [ ] Pattern revelation insight type working
- [ ] Avoidance detection insight type working
- [ ] Peak performance insight type working
- [ ] Stress tell insight type working
- [ ] Anomaly insight type working
- [ ] Break signal insight type working
- [ ] Comparative insight type working
- [ ] Returning user insight type working
- [ ] First-ever insight has special treatment — longer pre-glow, deeper bloom, distinct energy
- [ ] Insight deduplication — same topic not repeated within 48 hours
- [ ] All generated insights stored in database
- [ ] Pending insight dot indicator appears on tray icon when a bubble is waiting

---

## Group 8 — Dashboard
*The app remembers.*

- [ ] Dashboard panel opens from system tray — frosted glass, pinned to corner
- [ ] Open and close animate smoothly
- [ ] State header shows current state label and how long the creature has been in it
- [ ] Today at a glance — total active time, longest focus block today, insights surfaced today
- [ ] 7-day activity chart — stacked bars showing focus, deep, and burn minutes per day
- [ ] State distribution this week — breakdown of time spent in each state
- [ ] Insight history log — all past bubbles in reverse chronological order, full text readable
- [ ] Personal bests — longest focus session ever recorded, best day this week
- [ ] "What Wisp knows" panel — plain language summary of what has been collected and inferred this session
- [ ] Day-one empty state — chart and history sections show a calm, informative message when no data exists yet

---

## Group 9 — Settings
*The app is configurable.*

- [ ] Full settings panel UI renders and is accessible from dashboard and tray
- [ ] Inference mode badge always visible at the top — shows local or cloud at all times
- [ ] OpenRouter API key can be entered, saved, and cleared
- [ ] Tier 2 permission toggles — screen content, clipboard, calendar — each with plain-language description
- [ ] Active sensors list — live view of exactly which signals are currently running
- [ ] Insight frequency cap — user can set maximum bubbles per day (1 to 5)
- [ ] Sound toggle — optional chime when a bubble appears, off by default
- [ ] Creature size selector — small, medium, large
- [ ] Default corner selector — four corners
- [ ] Idle opacity control — how faded the creature becomes during inactivity
- [ ] Auto-sleep schedule — set start and end of quiet hours
- [ ] Data retention display — shows current retention windows in plain language
- [ ] Clear raw data — with plain-language confirmation dialog
- [ ] Export insights — downloads all insight text as a plain file
- [ ] Privacy mode keyboard shortcut — configurable hotkey for instant pause
- [ ] "Review permissions" entry point — re-enters the Tier 2 opt-in flow for users who want to change earlier choices

---

## Group 10 — Onboarding
*The app welcomes.*

- [ ] Welcome screen — what Wisp is, in plain language, no jargon
- [ ] Tier 1 disclosure screen — exactly what is collected automatically, before collection starts
- [ ] Screen content opt-in screen — what it is, what it is not, yes or no
- [ ] Clipboard activity opt-in screen — what it is, what it is not, yes or no
- [ ] Calendar context opt-in screen — what it is, what it is not, yes or no
- [ ] Summary screen — shows exactly what Wisp will and will not collect based on the choices just made
- [ ] Creature appears on screen for the first time at the end of onboarding
- [ ] First bubble appears — "give me a few days. i'll tell you something when i know something."
- [ ] Settings reminder — user is told they can change any of this at any time

---

## Group 11 — Polish: Creature Interactions
*The app delights.*

- [ ] Hover reveals state label and duration in pixel font
- [ ] Slow cursor movement across creature triggers a content, settled reaction
- [ ] Single click — bounce and wing flutter, reaction varies subtly by current state
- [ ] Double click — stronger surprise animation, wing flare
- [ ] Click while a bubble is visible — bubble dismisses, creature acknowledges
- [ ] Click during deep or flow state — gentler reaction so as not to disrupt
- [ ] Drag pick-up — creature squishes on grab, wings spread as if caught
- [ ] Slow drag — creature floats calmly, slight lag behind cursor
- [ ] Fast drag — creature stretches in direction of movement
- [ ] Release at low velocity — creature settles gently with a small landing bounce
- [ ] Release at high velocity — creature carries momentum, decelerates, lands harder
- [ ] Landing bounce scales with landing speed
- [ ] Screen edge collision — creature bumps into edges and bounces back slightly
- [ ] Post-landing shake-off animation
- [ ] Right-click directly on creature opens a minimal context menu

---

## Status Summary

| Group | Name | Status |
|---|---|---|
| 1 | Foundation | Complete ✅ |
| 2 | Data Pipeline | In Progress (12/13 complete — display brightness + audio device state deferred) |
| 3 | Baseline and State Machine | Complete ✅ |
| 4 | Creature Comes Alive | Complete ✅ |
| 5 | Core Controls | Complete ✅ |
| 6 | AI Inference | Not started |
| 7 | Chat Bubbles | Not started |
| 8 | Dashboard | Not started |
| 9 | Settings | Not started |
| 10 | Onboarding | Not started |
| 11 | Polish: Creature Interactions | Not started |
