# CLAUDE.md — Wisp

## What Wisp Is

Wisp is a passive Windows desktop companion. A pixel art creature (a winged ball) lives as a transparent always-on-top overlay. It silently monitors keyboard timing, mouse behavior, and system signals — never content, only patterns — builds a personal behavioral baseline over time, classifies the user's mental state using a rule-based engine, and occasionally surfaces AI-generated observations through chat bubbles. Everything runs locally. No account required.

---

## Source of Truth

**Read the relevant doc before starting any task. Do not assume — verify.**

| Document | Read when |
|---|---|
| `docs/ARCHITECTURE.md` | Any backend, sensor, inference, storage, or UI decision |
| `docs/TECHSTACK.md` | Choosing libraries, adding dependencies, understanding the stack |
| `docs/FEATURES.md` | Understanding what a feature does and its phase (V1/V2/V3) |
| `docs/ROADMAP.md` | Understanding build order and current progress |
| `docs/DATA.md` | Anything touching data collection, signal definitions, or privacy tiers |
| `docs/OPENQUESTIONS.md` | Unresolved decisions — do not implement these without resolving first |

When a decision in the code conflicts with a doc, the doc wins. If a doc is wrong, update the doc and flag it — do not silently diverge.

---

## Tech Stack

| Layer | Technology |
|---|---|
| App shell | Tauri 2 (Rust backend + React/TypeScript frontend) |
| Input capture | rdevin (Rust), runs in a separate child process |
| System signals | windows-rs |
| AI inference | OpenRouter (demo) → Ollama (local) |
| Storage | SQLite with WAL mode |
| Settings | Tauri store plugin |
| API key storage | keyring crate (Windows Credential Manager) |
| Sprite rendering | HTML canvas, `image-rendering: pixelated` |
| Audio | Web Audio API, bundled files |
| Updater | Tauri updater plugin + GitHub Releases |

---

## Build and Dev Commands

```bash
# Install dependencies (run once)
npm install

# Start dev server (hot reload)
npm run tauri dev

# Production build
npm run tauri build
```

These commands run from the project root. The Tauri CLI handles both the Rust backend and React frontend in one command.

---

## Architecture Non-Negotiables

These are hard rules derived from `docs/ARCHITECTURE.md`. Never violate them.

1. **Input capture is event-driven only.** No polling loops for keyboard or mouse. rdevin fires on OS events.
2. **rdevin runs in a separate child process.** Never in-process with Tauri — doing so causes keyboard events to silently drop when the window has focus.
3. **Raw events never touch storage.** Events accumulate in a ring buffer, get aggregated every 60 seconds, then are discarded. Only the computed summary is written to SQLite.
4. **SQLite uses WAL mode** with `synchronous=NORMAL`, `busy_timeout=5000`, and separate read/write connection pools.
5. **The keyring crate handles API key storage.** Never write sensitive values to the Tauri store, SQLite, or any plaintext file.
6. **Per-region click-through requires a Rust polling loop.** Tauri has no native hit-test region API — implement cursor position polling at ~60fps in Rust.
7. **All files live under `%APPDATA%\Wisp\`.** Nothing written to `%ProgramData%` or any shared system path.
8. **Single instance via `tauri-plugin-single-instance`.** Must be registered first in the plugin chain.

---

## Privacy Rules

These are absolute. No exceptions.

- **Never capture which key was pressed.** Only timing metadata: key-down timestamp and key-up timestamp.
- **Never store raw events.** Aggregate, then discard.
- **Never send behavioral data to any external service without the user having entered an OpenRouter API key.** The key entry is the consent signal.
- **Never write the API key to disk in plaintext.** Always use the keyring crate.
- **Behavioral data stays in `%APPDATA%\Wisp\`.** Never transmit it unless OpenRouter is the active inference mode and the user has set a key.

---

## Performance Rules

- Wisp must not noticeably affect gaming, video editing, or any CPU-intensive workload.
- The rdevin child process and system signal poller are the only persistent background work.
- Do not add polling loops unless absolutely necessary. Prefer OS events.
- Self-throttling thresholds are deferred — build first, profile under real conditions, then set limits from measured data.
- When in doubt about performance impact: measure before optimizing, not after.

---

## Git Workflow

1. **Never commit directly to `main`.** Always create a branch first.
2. **Branch naming:** `feat/`, `fix/`, or `chore/` prefix. Example: `feat/sensor-pipeline`.
3. **Commit at every logical checkpoint.** Do not batch everything into one commit at the end.
4. **Use the `git` subagent for all git operations.** Never run git commands yourself.
5. **Merge only after the build passes with zero errors or warnings.**

---

## Subagent Routing

| Subagent | Model | Use when |
|---|---|---|
| `git` | Haiku 4.5 | Any git operation — branching, staging, committing, pushing |
| `plan` | Opus 4.6 | Architecture decisions, implementation planning, non-trivial feature design |
| `review` | Sonnet 4.6 | Code review after implementation |

---

## Windows-Specific Notes

- Use **work area** (not full screen dimensions) for all creature positioning — the taskbar and side docks must always be respected.
- The Tauri window is transparent and always-on-top, but truly exclusive fullscreen apps (games running in exclusive mode) push it behind — this is acceptable, handle gracefully.
- Windows power events (system sleep/wake) are listened to via windows-rs — treat system wake as a session boundary.
- DPI scaling varies widely across Windows machines — save creature position as percentage of work area, never raw pixels.
