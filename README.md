# Wisp

A passive desktop companion for Windows. A pixel art creature lives as a transparent overlay on your screen, silently watching how you work — not what you do, only how you do it. Over time it learns your patterns, reflects your current state through its appearance, and occasionally surfaces a quiet observation about your behavior.

Everything runs on your machine. No account. No cloud. No content ever captured.

---

## What it does

Wisp monitors keyboard timing, mouse behavior, and system signals in the background. It builds a personal baseline of your normal work patterns and classifies your current mental state into one of seven moods — focus, calm, deep, spark, burn, fade, or rest. The creature's appearance reflects that state in real time.

When Wisp has something worth saying — a pattern it has noticed, a signal that something has shifted — it speaks through a small chat bubble. It does this rarely and only when it is confident.

---

## Status

> Planning and design complete. Implementation has not started.

| Group | Name | Status |
|---|---|---|
| 1 | Foundation | Not started |
| 2 | Data Pipeline | Not started |
| 3 | Baseline and State Machine | Not started |
| 4 | Creature Comes Alive | Not started |
| 5 | Core Controls | Not started |
| 6 | AI Inference | Not started |
| 7 | Chat Bubbles | Not started |
| 8 | Dashboard | Not started |
| 9 | Settings | Not started |
| 10 | Onboarding | Not started |
| 11 | Polish: Creature Interactions | Not started |

See `docs/ROADMAP.md` for the full feature checklist.

---

## Tech stack

- **App shell:** Tauri 2 (Rust backend + React/TypeScript frontend)
- **Input capture:** rdevin (Rust), runs in a separate child process
- **System signals:** windows-rs
- **AI inference:** OpenRouter → Ollama (local fallback)
- **Storage:** SQLite
- **Platform:** Windows (V1), macOS (V2)

---

## Documentation

All design and architecture decisions are documented in `docs/`.

| File | Contents |
|---|---|
| `docs/IDEA.md` | What Wisp is and why it exists |
| `docs/ARCHITECTURE.md` | Every architectural decision — source of truth |
| `docs/FEATURES.md` | Full feature list with phase markers |
| `docs/TECHSTACK.md` | Technology choices and rationale |
| `docs/DATA.md` | Signal definitions and privacy tiers |
| `docs/ROADMAP.md` | Build order and progress tracker |
| `docs/OPENQUESTIONS.md` | Unresolved decisions |

---

## Getting started

> Prerequisites and build instructions will be added once the project is scaffolded (Group 1).

---

## Privacy

Wisp captures keystroke timing and mouse movement patterns only — never which keys were pressed, never any text content. Raw events are aggregated in memory and discarded. Nothing leaves your device unless you provide an OpenRouter API key, in which case only abstract behavioral descriptions are sent (e.g. "typing speed 35% above baseline") — never raw data, never content.

---

## License

Business Source License 1.1 — see `LICENSE`. Converts to MIT on 2030-05-04.
