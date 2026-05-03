# Wisp — Open Architecture Questions

This document is a parking lot. Every question here is a real decision that needs an answer before or during implementation. They are grouped by layer, not by priority.

Questions get moved to the relevant architecture doc once they are decided. They do not get answered speculatively — each one gets researched or validated against the actual build.

---

## Layer 1 — Data Collection

**Q1. Sensor window definition**
The 30-second time-based window has a flaw — a slow typist produces far fewer keystrokes than a fast typist in the same window, making the readings incomparable. Should the feature window be time-based, keystroke-count-based (e.g. every 150 keystrokes), or hybrid (whichever comes first)?

**Q2. Mouse capture method**
Is event-driven mouse capture via rdev more efficient than polling at 10 Hz? What is the actual CPU cost difference in a background Tauri app over an 8-hour workday?

**Q3. Session definition**
What counts as a session? When does one session end and another begin? ActivityWatch uses 5 minutes of inactivity as the AFK threshold. What does Wisp use, and does it matter for how features are computed?

**Q4. What counts as "active" for the inference floor**
The 5-minute minimum observation window before inference requires 5 minutes of what, exactly? Active typing? Any input? Any foreground app? A user who is reading silently generates no keyboard events — does Wisp wait indefinitely?

---

## Layer 2 — Baseline and State Machine

**Q5. State definitions — behavioral thresholds**
The 7 states (focus, calm, deep, spark, burn, fade, rest) need actual behavioral definitions before any rule engine can be built. What signal combinations map to each state? What are the thresholds? These must be within-person relative thresholds, not population averages — but what are the relative rules?

**Q6. Baseline calculation method**
How is the personal baseline computed? Simple rolling average? Exponential moving average? What is the lookback window — 7 days, 30 days? How frequently does the baseline update — after every session, once per day?

**Q7. Cold start — the first week**
The rule engine requires a personal baseline that does not exist yet. What does Wisp do during the first 7 days? Options: use population-level defaults, show a "still learning" state, defer all inference, or build baseline from the first session. What is the right answer and what do comparable apps do?

**Q8. State transition debounce**
How long must a signal stay in a new threshold range before the creature changes state? Without debounce, the creature flickers every 30 seconds. What is the minimum dwell time before a transition commits?

**Q9. Multi-session continuity**
If a user works 9–11am, breaks for 3 hours, then works 2–5pm — are these the same day's session or separate? How does this affect daily summaries, baseline updates, and the dashboard chart?

---

## Layer 3 — AI Inference Pipeline

**Q10. Inference trigger — state change vs time clock**
The current decision fires AI every 5 minutes if active. But if nothing interesting has changed, this generates redundant API calls and costs money. Should inference only fire on: (a) state transitions, (b) behavioral anomalies, (c) a time floor as a fallback, or (d) all three? What is the right threshold for "something interesting happened"?

**Q11. Daily inference cost**
At 96 calls/day × ~2,500 tokens/call = ~240,000 tokens/day. What is the actual dollar cost at DeepSeek V3.2 pricing for a user who works 8 hours? Is this acceptable, and if not, how do we reduce it without degrading insight quality?

**Q12. System prompt design**
What exactly is in the system prompt? The model needs: a persona definition, the 7 state definitions, the output schema, and enough context to generate insight text. Draft needed before implementation.

**Q13. Output schema**
What structured JSON does the model return? At minimum: state label, insight text. Does it also return a confidence level, a mood score, an anomaly flag? What does the app do if the model returns malformed JSON?

**Q14. "Tell me more" architecture**
The InsightCard has a "tell me more" button. Does clicking it: (a) make a new AI call with the same data asking for deeper analysis, (b) expand pre-generated extended text from the original call, or (c) open the dashboard? Option (a) has latency and cost implications. Option (b) requires the original call to generate more text upfront.

**Q15. Insight deduplication**
How do we prevent the same insight surfacing repeatedly? Is there a cache of recent insight themes? What is the deduplication logic — exact string match, semantic similarity, topic tracking?

---

## Layer 4 — Storage and Privacy

**Q16. SQLite encryption implementation**
SQLite has no built-in encryption on Windows. The options are: SQLCipher (adds a dependency, complicates the build), Windows DPAPI (native, simpler, but less portable), or unencrypted with file-system permissions only. Which is right for a V1 hackathon build vs a production release?

**Q17. OpenRouter privacy boundary**
When Wisp falls back to OpenRouter, natural language behavioral descriptions leave the device. Even abstracted ("typing speed dropped 40% from baseline") may constitute behavioral biometric data under GDPR Article 4. What level of abstraction is sufficient? Does the user need to explicitly consent to cloud inference separately from local inference?

**Q18. Settings storage**
Where are user settings stored? Options: a separate JSON config file in the app data directory, a `settings` table in the same SQLite database, or Tauri's built-in store plugin. What is the right choice and why?

---

## Layer 5 — Startup, Lifecycle, and Resilience

**Q19. Startup sequence**
What is the exact order of operations when the app launches? Ollama probe, baseline load, sensor thread start, UI render — what order, what happens if each step fails, and what does the creature show while initializing?

**Q20. Resilience — what breaks and how**
What happens when: rdev stops receiving keyboard events (known Tauri focus bug), Ollama crashes mid-inference, a SQLite write fails, OpenRouter returns a 429 or 500? The app must never crash or lose data. What are the recovery strategies for each?

**Q21. App update mechanism**
How does Wisp update itself? Tauri has a built-in updater plugin. Does Wisp use it? What is the update server? Does auto-update make sense for a local-only app?

---

## Layer 6 — UI and Overlay

**Q22. Creature position and dragging**
Where does the creature live by default? Is it draggable? What happens when a maximized window covers it — does it hide, does it stay on top, does it move to a visible edge? Does "always on top" mean above fullscreen apps too?

**Q23. System tray menu contents**
What exactly is in the right-click tray menu? At minimum: show/hide, sleep, settings, quit. What does "sleep" mean — suspend data collection, suspend UI only, or both?

**Q24. Dashboard on day one**
The dashboard shows a 7-day bar chart. On day 1 there is no history. What does the chart show? Empty bars? A message? Does the dashboard even open before there is enough data to display?

**Q25. Dashboard data queries**
What SQL queries power the dashboard? How are daily focus/burn/deep minutes computed from raw snapshots? What is the schema that makes these queries fast at 90 days of data?

---

## Decisions Already Made (resolved, not open)

For reference — these are closed and documented in TECHSTACK.md and DATA.md.

- Desktop shell: Tauri 2 + Rust + React/TypeScript
- Input hooks: rdev (Rust)
- System signals: windows-rs
- AI inference: Ollama (local) + OpenRouter (fallback)
- Storage: SQLite
- Platform: Windows V1, Mac V2
- Tier 3 (webcam, mic): deferred to V2/V3
- Retention tiers: 30 days raw snapshots, 1 year summaries, indefinite insights
