# Wisp — Open Architecture Questions

This document is a parking lot for unresolved decisions. Questions get resolved here and their answers get written into `docs/ARCHITECTURE.md`.

---

## Open Questions

### Q46 — Debug overlay needs classifier state (Group 4 task)

`get_debug_info` (commands.rs) was written in Group 2 and has no visibility into classifier state after Group 3. It currently shows sensor and snapshot data but cannot report the current `WispState`, whether cold start is active, or how many days until the personal baseline activates.

**Where to add it:** Extend `DebugInfo` in `commands.rs` with fields: `current_state: String`, `cold_start: bool`, `days_since_first_session: Option<i64>`. Read `StateMachine` from Tauri managed state (`State<Arc<Mutex<StateMachine>>>`), and call `get_first_session_ms` to compute days elapsed. The `DebugOverlay.tsx` component was removed in Group 3 Task 0 — if the overlay is resurrected for Group 4 debugging, wire these fields there.

**Why deferred:** The debug overlay was removed as part of Group 3 cleanup. The correct time to add classifier visibility is when Group 4 begins using state to drive creature animations, at which point live state inspection becomes actively useful for debugging visual behavior.

---

## Resolved Decisions

All of the following were answered during the architecture brainstorming session and are documented in full in `docs/ARCHITECTURE.md`.

| # | Question | Answer |
|---|---|---|
| Q1 | Sensor window definition | 60-second time-based aggregation window. Events held in ring buffer, summary written to SQLite, raw events discarded. |
| Q2 | Mouse capture method | Pure event-driven via rdevin. No polling. Child process isolation prevents the Tauri focus bug. |
| Q3 | Session definition | 10 minutes of zero input ends a session. Manual sleep ends immediately. System wake is also a session boundary. |
| Q4 | What counts as "active" for inference floor | At least one mouse movement per minute on average over a 5-minute window. |
| Q5 | State definitions — behavioral thresholds | All 7 states defined with relative per-person thresholds. Full definitions in ARCHITECTURE.md Layer 2. |
| Q6 | Baseline calculation method | EMA with 14-day decay window, updated once daily at end of last session, segmented by time-of-day and day-of-week. Reliable only after 30 days of data. |
| Q7 | Cold start — the first week | Population-level defaults for first 30 days, "still learning" visual shown, no insights generated. Silent switch to personal baseline at day 30. |
| Q8 | State transition debounce | 3 minutes. Signal must stay in new range for 3 continuous minutes before state commits. Timer resets if signal drifts back. |
| Q9 | Multi-session continuity | Sessions tracked separately internally; dashboard rolls up to daily view. |
| Q10 | Inference trigger | Three triggers in priority order: state transition, behavioral anomaly, 90-minute time floor fallback. |
| Q11 | Daily inference cost | ~$0.0015/user/day maximum at 3 insights/day cap. No additional guardrails needed beyond the cap. |
| Q12 | System prompt design | Persona + voice rules + 7 state definitions + output schema + quality rules. Under 300 words for user message per call. |
| Q13 | Output schema | JSON with four fields: state, insight, extended, type. |
| Q14 | "Tell me more" architecture | Pre-generated in same call as the main insight. No second API call. |
| Q15 | Insight deduplication | Track last 10 types with counts. 1st→normal, 2nd→follow-up framing, 3rd→stronger follow-up, 4th+→suppressed. Anomaly type always surfaces. |
| Q16 | SQLite encryption | No encryption V1. DPAPI planned for V2. Behavioral metadata has no sensitive content. |
| Q17 | OpenRouter privacy boundary | Skipped — API key entry is the consent signal. |
| Q18 | Settings storage | Tauri store plugin for settings. keyring crate for API key. |
| Q19 | Startup sequence | Settings → baseline → probe AI → start sensors → render creature → begin classification → resume inference eligibility. |
| Q20 | Resilience | Per-failure-domain strategy for rdevin drop, Ollama crash, SQLite write failure, OpenRouter error. Full detail in ARCHITECTURE.md. |
| Q21 | App update mechanism | Tauri updater plugin + GitHub Releases + tauri-action for manifest generation. |
| Q22 | Creature position and dragging | Work area used everywhere. Position saved as percentage. Creature roams freely across all monitors. Always-on-top; exclusive fullscreen apps push it behind — acceptable. |
| Q23 | System tray menu | State label (read-only), Open Dashboard, Sleep/Wake, Privacy Mode/Resume, Settings, Launch at Startup toggle, Quit. |
| Q24 | Dashboard on day one | Full dashboard shown with calm empty states per section. Wisp voice messages for each empty area. |
| Q25 | Dashboard data queries | Pre-aggregated daily_summaries table. Dashboard never queries raw snapshots. |
| Q26 | Creature positioning across DPI/resolutions | Position saved as percentage of work area, not raw pixels. Clamped to safe zone on launch. |
| Q27 | Taskbar handling | Work area used everywhere — taskbar always subtracted from positioning space. |
| Q28 | Idle movement algorithm | Subtle drift of 10–20px after 5 minutes of inactivity. Rest state = grounded, no drift. |
| Q29 | Throw physics | Friction 0.85/frame, boundary bounce 40%, landing threshold 2px/frame. Bounce animation scales with impact speed. |
| Q30 | Launch animation | Two-phase: wind-up (200ms squish + wings spread) then launch (150ms pop + float back). Light version for minor state changes. |
| Q31 | Pre-insight glow sequence | Phase 1 awareness (600ms), Phase 2 pulse (800ms), Phase 3 bloom + nod (600ms). First-ever insight gets extended treatment. |
| Q32 | Multi-monitor | Creature roams freely across all monitors. DPI re-renders on boundary crossing. |
| Q33 | Sleep vs privacy mode | Both grayscale. Sleep = timer-based or scheduled. Privacy = manual only, manual end. Both tray-only, no hotkey. |
| Q34 | Bubble positioning | Quadrant-based, always opens toward screen center. Safety check to keep fully within work area. |
| Q35 | System wake handling | System wake = session boundary. 4+ hour absence triggers returning user animation. |
| Q36 | Multiple user accounts | %APPDATA%\Wisp\ is isolated per Windows account automatically. |
| Q37 | Self-throttling | Deferred — build first, measure under real conditions, set thresholds from profiled data. |
| Q38 | Fullscreen and DND | Migrate to free monitor if available. Queue if all monitors fullscreen. DND respect is opt-in setting, off by default. |
| Q39 | First launch vs returning launch | onboarding_completed flag in Tauri store. Single instance via tauri-plugin-single-instance. |
| Q40 | Click-through implementation | Rust polling loop at ~60fps toggling setIgnoreCursorEvents based on cursor position vs interactive region bounds. |
| Q41 | Rust-to-React communication | Tauri event system for lifecycle signals. Switch to Channels if any stream exceeds ~1 update/second. |
| Q42 | Sprite animation system | 12fps, per-state sprite sheets, canvas crossfade over 300ms. rAF with elapsed-time throttle. Fixed canvas size, scaled via CSS transform. |
| Q43 | Anomaly definition | 1.96 SD (95th percentile) on log-transformed metric values vs personal baseline, sustained 5 minutes. |
| Q44 | Screen edge snapping | 20px snap zone, drag only. Corner snap if within 20px of both edges. |
| Q45 | Audio system | Web Audio API, bundled files, opt-out (on by default). convertFileSrc + asset:// protocol for production builds. CSP must allow media-src asset:. |
