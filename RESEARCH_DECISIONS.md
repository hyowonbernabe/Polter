# Wisp Research Decisions

This file turns `RESEARCH.md` into product rules.

Goal: decide what Wisp should collect, how strongly each signal should matter, and when Wisp is allowed to speak with confidence.

## 1) Collection defaults

### Default on (Tier 1)

These are safe enough and useful enough to collect by default:

- Keystroke timing and key hold timing (never key content)
- Typing pause rhythm
- Backspace and delete counts
- Mouse movement quality (speed, smoothness, jitter)
- Active app name and time spent
- App switching rate
- Idle time
- Session start/end time
- Break duration and break frequency
- Time to first break
- Notification response speed
- Display brightness and night mode state
- Multi-monitor switching

### Default on, but low influence (Tier 1 context only)

Collect these quietly, but do not let them drive major conclusions alone:

- Undo and redo frequency
- Shortcut usage frequency
- Deletion-to-creation ratio
- Click frequency
- Scroll behavior
- Mouse text selection frequency
- CPU and memory level
- Battery and power source
- Audio device state
- Network activity level (coarse)
- Open window/tab count
- Window management patterns

### Do not collect (Tier 1 cuts)

These are too weak or too easy to misread:

- Caps Lock frequency
- Zoom level change frequency
- Right-click frequency
- File save frequency
- Screenshot frequency

### Opt-in only (Tier 2)

Keep these optional with clear explanation and easy off switch:

- Screen content type classification (coarse labels only, local-only, no raw image storage)
- Clipboard action frequency (no content)
- Calendar structure context (meeting proximity and density, no titles)

### Deferred (Tier 3)

Camera and microphone stay future-only. If added later, they must be explicit permission, local-only processing, and always-visible sensor status.

---

## 2) Signal influence weights

Use a simple 5-level weight system.

- **5 = Core signal** (high trust)
- **4 = Strong support signal**
- **3 = Helpful context signal**
- **2 = Weak context signal**
- **1 = Noise filter only**

### Suggested weights

| Signal group | Weight |
|---|---:|
| Keystroke timing stability and shift from personal normal | 5 |
| Typing pause rhythm shift from personal normal | 5 |
| Mouse movement quality shift (speed/smoothness/jitter) | 4 |
| App switching rate and interruption bursts | 5 |
| Break quality (duration/frequency/time to first break) | 5 |
| Notification response speed pattern | 4 |
| Session timing and day rhythm pattern | 4 |
| Calendar meeting context (if opt-in) | 4 |
| Screen content class (if opt-in) | 3 |
| Clipboard frequency (if opt-in) | 2 |
| Device context (CPU/memory/network/power/audio) | 2 |
| Window/tab count and layout behavior | 2 |
| Very weak interaction counters | 1 |

Rule:
- No weight-1 or weight-2 signal can produce an insight by itself.

---

## 3) Minimum evidence before Wisp speaks

Wisp should only show an insight bubble when all rules below pass.

### Baseline rule

- Need at least 7 active days of history before using strong language.
- Before day 7, only allow gentle observations.

### Agreement rule

- At least 3 independent signals must point in the same direction.
- At least 2 of those signals must be weight 4 or 5.

### Stability rule

- Pattern must persist for at least 20 minutes in-session,
  or repeat on at least 3 days in a rolling 7-day window.

### Conflict rule

- If strong signals conflict, do not make a strong claim.
- Fall back to low-confidence wording.

### Context guardrail rule

- If a meeting is near or active (when calendar opt-in exists), lower confidence for focus-related claims unless signals are very strong.
- If active call context is detected in the future, pause normal behavioral interpretation.

---

## 4) Confidence levels and wording

Use three levels for user-facing insight text.

### Low confidence

When to use:
- New user period, weak agreement, or high conflict.

Wording style:
- "Maybe", "might", "could".

Example:
- "You might be in a reactive stretch right now."

### Medium confidence

When to use:
- 3+ agreeing signals with at least one core signal and low conflict.

Wording style:
- "It looks like", "seems like".

Example:
- "It looks like your focus has been interrupted more than usual this hour."

### High confidence

When to use:
- 4+ agreeing signals, including 2+ core signals, stable over time, low conflict.

Wording style:
- Still avoid absolute language.

Example:
- "Your pattern strongly suggests meeting-related strain before calls today."

Never say:
- "You are anxious."
- "You have burnout."
- "This proves..."

---

## 5) Insight trigger templates (recommended)

### Focus quality drop

Require:
- App switching up,
- notification response getting faster,
- typing rhythm less stable,
- and reduced uninterrupted work stretch.

Minimum confidence:
- Medium.

### Fatigue-like drift

Require:
- Typing slows vs personal normal,
- pause length rises,
- mouse jitter rises,
- break pattern worsens across day.

Minimum confidence:
- Medium.

### Pre-meeting strain (if calendar opt-in)

Require:
- Meeting starts within 10 to 30 minutes,
- keyboard/mouse tension signals rise,
- switching or notification reactivity rises.

Minimum confidence:
- Medium.

### Healthy recovery

Require:
- Break taken,
- post-break movement and typing stability improve,
- switching pressure drops.

Minimum confidence:
- Medium.

---

## 6) User safety and trust rules

1. Never present medical claims.
2. Never use a single signal to make a strong emotional claim.
3. Always allow user override and feedback.
4. Keep raw sensitive media out of storage.
5. Show clear "why" behind each insight in plain words.

---

## 7) Implementation priorities

### Build now

- Weight and confidence framework in scoring pipeline.
- Multi-signal agreement checks.
- Low/medium/high wording templates.
- New-user guardrails for first-week uncertainty.

### Build next

- Per-user signal calibration updates every day.
- "Insight reason" panel showing top 2 to 4 signals used.
- Signal quality checks to suppress noisy periods.

### Build later

- Tier 3 sensor framework with strict permission and local-only processing.
- More advanced personalization for role-specific patterns.
