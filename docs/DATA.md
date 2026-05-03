# Wisp — Data Collection Reference

This document covers every signal Wisp can collect, what each one reveals, and what level of user permission is required before collecting it.

The guiding principle: **Wisp never collects more than it needs, and it never collects anything without the user understanding what and why.**

At the end of this document, a **Signal Verdict** table summarizes every signal's useability and whether it belongs in Wisp.

---

## Build Phases

Not every signal ships in V1. This document covers the full intended scope. Each section is marked with its target phase.

| Phase | Scope |
|---|---|
| **V1 — Hackathon (Windows)** | Tier 1 signals + Tier 2 opt-ins. All processing on-device. No camera, no microphone. |
| **V2 — Post-Hackathon** | Tier 3 webcam signals (presence, distance, look-away). rPPG heart rate if feasible. |
| **V3 — Future** | Tier 3 microphone signals. Mac port. Mobile companion. |

Anything marked **DEFERRED** in this document is fully designed and ready to build — it is not included in V1 due to time and complexity constraints only.

---

## Permission Tiers

Wisp uses three tiers of data collection:

**Tier 1 — Collected automatically on install.**
These signals are low-sensitivity, contain no personal content, and are the minimum required for Wisp to function at all. The user is informed about these during onboarding but no additional action is required.

**Tier 2 — Opt-in during onboarding.**
These signals are more revealing or slightly more sensitive. Wisp asks the user to enable them during the setup flow with a clear explanation of what each one does. The user can skip any or all of them.

**Tier 3 — Explicit permission required, separately.**
These signals involve the camera or microphone. They are never collected passively or silently. The user must actively grant permission through a dedicated screen, and they can revoke it at any time from settings. **Tier 3 is fully deferred — not included in V1.**

**All tiers share one rule: everything is processed on-device. Nothing is ever sent to a server.**

---

## Tier 1 — Automatic on Install

### Keyboard Dynamics

| What is collected | What it is NOT |
|---|---|
| Time between keypresses | The actual keys pressed |
| How long each key is held down | Words, sentences, or any content |
| Length of pauses mid-typing | Passwords or sensitive input |
| Backspace and delete frequency | Application-specific text |
| Typing session duration | |
| Undo and redo action frequency | |
| Keyboard shortcut usage frequency | Which shortcuts were pressed |
| Deletion-to-creation ratio (how much is deleted vs written) | |
| Caps Lock activation frequency | |

**What this reveals:** Cognitive state, stress level, flow vs. fatigue, avoidance behavior, cognitive fitness trends over time. High undo/redo rate signals rethinking and uncertainty. High deletion ratio signals struggle, low confidence, or editing mode. Heavy shortcut use signals expert flow state.

**Why no explicit permission:** Wisp collects timing metadata and action counts only — never the content of what was typed.

**User is told:** "Wisp watches how you type — the speed, rhythm, and how often you correct yourself — not what you type. Your words are never seen or stored."

**Verdicts for additions:**
- Undo/redo frequency — **KEEP.** Direct window into indecision and rethinking. Strong signal.
- Shortcut usage — **KEEP.** Reveals expertise level and whether someone is in a deep flow state.
- Deletion-to-creation ratio — **KEEP.** One of the best new signals. High ratio = editing/struggling, low = drafting freely.
- Caps Lock frequency — **CUT.** Almost never meaningful. Too sparse and situational to produce signal.

---

### Mouse Behavior

| What is collected | What it is NOT |
|---|---|
| Cursor movement speed | Screen coordinates mapped to content |
| Path efficiency (straight vs. curved) | What was clicked |
| Click frequency | What was right-clicked |
| Micro-jitter and tremor | Drag content |
| Idle time (no movement) | |
| Scroll speed and pattern | |
| Scroll depth (how far down a page) | What the page contained |
| Right-click frequency | |
| Text selection frequency (mouse-based) | The text that was selected |
| Zoom level change frequency | |

**What this reveals:** Stress level, fatigue, engagement, boredom, anxiety, motor control baseline. Scroll depth reveals reading vs skimming. Right-click frequency hints at context-menu-heavy workflows.

**Why no explicit permission:** Mouse movement is positional and behavioral data with no content attached.

**User is told:** "Wisp watches how your mouse moves — speed, steadiness, pauses, and scrolling — to understand your energy and focus level."

**Verdicts for additions:**
- Scroll depth — **KEEP.** Reveals reading vs. skimming behavior. Good signal for focus quality.
- Right-click frequency — **TRIM.** Low signal quality. Only useful as a noise filter, not a primary insight.
- Text selection (mouse) — **TRIM.** Noisy. Hard to distinguish deliberate selection from accidental. Marginal value.
- Zoom changes — **CUT.** Too sparse to be meaningful in isolation. Drops off quickly with habit.

---

### Application Focus

| What is collected | What it is NOT |
|---|---|
| Name of the active application | Window titles or document names |
| Time spent per application | File paths |
| Order of application switching | Browser URLs |
| Frequency of switching between apps | Tab contents |

**What this reveals:** Context switching rate, deep work vs. shallow work, procrastination patterns, focus session length, work type distribution across the day.

**Why no explicit permission:** Only the application name is captured (e.g., "VS Code", "Slack", "Chrome") — not what is inside it.

**User is told:** "Wisp knows which apps are open and how long you spend in each — like 'you spent 2 hours in your code editor today' — but never what is inside them."

---

### System Activity

| What is collected | What it is NOT |
|---|---|
| Time since last keyboard or mouse input | File contents |
| General CPU and memory usage level | Network traffic content |
| Battery drain rate | Installed application list |
| Time of day all activity occurs | |
| Session start and end times | |
| Break duration and frequency | |
| Time from work session start to first break | |

**What this reveals:** True break detection (vs. sitting still staring), work intensity, session patterns across days and weeks, break habits, wind-down behavior.

**Why no explicit permission:** These are system-level metrics with no personal content attached.

**Verdicts for additions:**
- Session start/end times — **KEEP.** Core signal for circadian and work rhythm analysis.
- Break duration/frequency — **KEEP.** Distinguishes healthy recovery from unsustainable stretches.
- Time-to-first-break — **KEEP.** Reveals whether someone pushes too long before resting.

---

### Window and Tab State

| What is collected | What it is NOT |
|---|---|
| Total number of open windows at a time | Window titles or content |
| Total number of open browser tabs | Tab URLs or page content |
| Rate of change in open window/tab count | |

**What this reveals:** Cognitive load. High window and tab counts correlate with scattered attention and task-juggling. Low counts signal focus. This is a real-time proxy for mental clutter.

**Why no explicit permission:** Only counts are captured — no titles, no content, no URLs.

**User is told:** "Wisp counts how many windows and tabs you have open as a rough measure of mental load — not what any of them contain."

**Wisp verdict: KEEP.** One of the most reliable cognitive load proxies available without content access.

---

### Window Management Patterns

| What is collected | What it is NOT |
|---|---|
| How often windows are resized or repositioned | Window titles or document names |
| Frequency of snapping windows side-by-side | |
| How often minimizing or maximizing occurs | |

**What this reveals:** Whether someone is in a single-task deep focus state (one full-screen window) or multi-tracking (frequent repositioning, side-by-side layouts).

**Why no explicit permission:** Structural behavior only. No content involved.

**Wisp verdict: TRIM.** Adds nuance to the window count signal but is weak on its own. Only useful in combination with other signals — not a primary insight driver.

---

### Notification Response Speed

| What is collected | What it is NOT |
|---|---|
| Time from notification appearing to it being dismissed or clicked | The content of the notification |
| Whether notifications are being ignored vs. acted on immediately | App that sent the notification |

**What this reveals:** Focus depth and reactive vs. proactive work style. Someone dismissing notifications instantly is easily distracted or waiting for something. Someone ignoring them for long periods is in deep focus or overwhelmed.

**Why no explicit permission:** Only response latency is captured. No notification content or sender is ever seen.

**User is told:** "Wisp notices how quickly you respond to or dismiss notifications — not what they say — to understand whether you're in a focused state or a reactive one."

**Wisp verdict: KEEP.** Surprisingly strong signal. Notification response is a real-time measure of distraction susceptibility.

---

### Display Settings

| What is collected | What it is NOT |
|---|---|
| Current display brightness level | Screen content |
| Whether night mode or blue light filter is active | |
| Time of day these change | |

**What this reveals:** Sleep hygiene signals. Someone who never turns on night mode, or who drops brightness late at night, is creating conditions for poor sleep. Correlating this with late-night sessions adds a health layer most apps completely ignore.

**Why no explicit permission:** System-level settings — no content, no behavior beyond a single numeric value.

**User is told:** "Wisp checks your screen brightness and night mode status to understand if your setup is working with your sleep or against it."

**Wisp verdict: KEEP.** Cheap to collect, adds a sleep-hygiene insight layer that is both novel and genuinely useful.

---

### Audio Device State

| What is collected | What it is NOT |
|---|---|
| System volume level | Audio content |
| Whether headphones or earbuds are connected | |
| Whether external speakers are in use | |

**What this reveals:** Environment context. Headphones on often means intentional focus mode. High system volume may indicate a noisy environment. This helps Wisp interpret other signals — for example, high typing stress plus headphones on often means someone is concentrating hard, not actually stressed.

**Why no explicit permission:** System metadata only. Requires no audio access.

**User is told:** "Wisp checks whether your headphones are plugged in and what your volume is set to — not what you're listening to — to understand your focus context."

**Wisp verdict: KEEP.** Important context modifier. Changes the interpretation of multiple other signals.

---

### Power Source

| What is collected | What it is NOT |
|---|---|
| Whether plugged in or on battery | Location |
| Battery percentage trend | Charging history |
| Rate of battery drain | |

**What this reveals:** Work location context and session intensity. Battery drain rate is a proxy for CPU-intensive work. Switching from plugged to battery often coincides with location change (desk to couch). Wisp can use this to detect informal vs. structured work sessions.

**Why no explicit permission:** System-level hardware state. No personal data.

**User is told:** "Wisp knows whether you're plugged in or on battery to understand whether you're at your desk or working from somewhere else."

**Wisp verdict: KEEP.** Cheap signal with real interpretive value. Helps separate structured work from casual browsing sessions.

---

### Multi-Monitor Focus

| What is collected | What it is NOT |
|---|---|
| Which monitor the active window is on (primary vs. secondary) | Coordinates of what is on each monitor |
| How often focus switches between monitors | Display content |

**What this reveals:** Workflow structure. Someone who keeps communication on a secondary monitor and code on primary has a deliberate setup. Frequent monitor switches correlate with divided attention and multi-tasking patterns.

**Why no explicit permission:** Monitor index only. No content or coordinates.

**Wisp verdict: KEEP.** Adds depth to focus analysis for multi-monitor users. Ignored gracefully for single-monitor users.

---

### Network Activity

| What is collected | What it is NOT |
|---|---|
| Whether network activity is high, low, or idle | URLs visited |
| Whether on Wi-Fi or ethernet | Network content |
| General data transfer volume (active vs. inactive periods) | |

**What this reveals:** Whether someone is downloading, uploading, or offline. High network activity during a typing session could mean research. Zero network during writing could mean deep drafting mode. Ethernet vs. Wi-Fi can correlate with desk vs. mobile setups.

**Why no explicit permission:** Activity level only — no packet content, no URLs, no hostnames.

**Wisp verdict: TRIM.** Moderately useful as a context layer but rarely drives a primary insight on its own. Keep as a quiet background signal.

---

### File Save Frequency

| What is collected | What it is NOT |
|---|---|
| How often Ctrl+S or equivalent is triggered | File names or paths |
| Regularity vs. sporadic saving behavior | File contents |

**What this reveals:** Anxiety and confidence level. Compulsive saving (Ctrl+S every few seconds) is a well-documented sign of anxiety or distrust in the system. Rare saving suggests either confidence or forgetting — which has different behavioral correlates.

**Why no explicit permission:** Key event count only. File names and paths are never accessed.

**User is told:** "Wisp counts how often you save your work — not what you're saving — as a surprising signal for stress level."

**Wisp verdict: KEEP.** Underrated signal. Compulsive Ctrl+S is a genuine behavioral tell that most people would find fascinating to see surfaced.

---

### Screenshot Frequency

| What is collected | What it is NOT |
|---|---|
| How often a screenshot shortcut is triggered | The screenshots themselves |
| Time-of-day pattern of screenshot activity | What was captured |

**What this reveals:** Research and documentation behavior. High screenshot frequency often accompanies research-heavy or bug-reporting workflows.

**Why no explicit permission:** Key event count only. Screenshots are never accessed or stored.

**Wisp verdict: TRIM.** Hard to interpret without more context. Only meaningful when combined with application focus data. Not worth surfacing as a primary signal.

---

## Tier 2 — Opt-In During Onboarding

### Screen Content Analysis

| What is collected | What it is NOT |
|---|---|
| Periodic low-resolution screenshot (every few minutes) | Continuous screen recording |
| Classification of content type on screen | Readable text |
| Visual context of what kind of work is happening | Passwords or sensitive fields (always excluded) |

**What this reveals:** Whether you are writing, reading, watching, communicating, or browsing. Helps Wisp understand the nature of your work rather than just which application is open. Enables detection of task-switching within a single application.

**Why opt-in:** Screenshots, even low-resolution and processed locally, feel more sensitive than metadata.

**How to ask:** "Can Wisp take an occasional blurry snapshot of your screen to better understand what kind of work you are doing? It processes the image locally and never stores the image itself — only a label like 'writing' or 'watching video'."

**User can disable at any time.**

---

### Clipboard Activity

| What is collected | What it is NOT |
|---|---|
| Frequency of copy and paste actions | The content that was copied or pasted |
| Time between copy and paste | The source or destination |

**What this reveals:** Research and synthesis behavior, whether work involves heavy information processing or mostly original creation.

**Why opt-in:** Even though no content is captured, some users may feel uneasy knowing clipboard actions are monitored.

**How to ask:** "Can Wisp track how often you copy and paste — not what, just how often — to understand your research and writing patterns?"

---

### Calendar Context

| What is collected | What it is NOT |
|---|---|
| Whether a meeting is happening in the next 30 minutes | Meeting titles or content |
| Number of meetings scheduled for the current day | Who the meetings are with |
| Whether the current time slot has a meeting in progress | |
| Number of meetings in the current week vs. typical week | |

**What this reveals:** Pre-meeting stress spikes are a well-documented phenomenon — keyboard tremor and cursor jitter reliably increase in the 10-20 minutes before a meeting. Meeting-dense days explain sustained fatigue even when keyboard output looks normal. Calendar context lets Wisp explain anomalies it observes rather than misattributing them.

**Why opt-in:** Calendar access feels personal even when no content is read. Reading the structure of someone's schedule (busy vs. free) is meaningfully different from reading file contents, but it still warrants explicit consent.

**How to ask:** "Can Wisp read the rough shape of your calendar — like whether you have a meeting coming up, not what it's about — so it can understand why your stress level might spike before calls?"

**User can disable at any time.**

**Wisp verdict: KEEP.** Calendar context is a major unlock for the quality of Wisp's insights. Without it, Wisp will regularly misread legitimate meeting-stress as a personal focus problem.

---

## Tier 3 — Explicit Permission Required *(DEFERRED — V2/V3)*

> **Not included in V1.** The full design is documented here so it can be built in a future version without re-designing from scratch.

### Webcam — Heart Rate, Breathing, and Presence (rPPG) *(DEFERRED — V2)*

| What is collected | What it is NOT |
|---|---|
| Subtle color changes in the face that correlate to heartbeat | Video footage |
| Derived heart rate | Images or frames stored |
| Derived breathing rate | Facial recognition or identity |
| Stress indicator from heart rate variability | Any biometric identification |
| Estimated distance from the screen | |
| Whether the user appears to be looking at the screen | Gaze tracking or eye tracking |
| Frequency and duration of looking away | |
| Gross head movement (nodding, shaking, leaning) | Facial expressions |
| Whether ambient lighting has changed significantly | |
| Whether a second person has entered the frame | Identity of that person |

**What this reveals:** Physical stress level, posture and fatigue (distance from screen), sustained attention (looking-away frequency), cognitive engagement (head movement patterns), environmental disturbance (lighting changes, another person present). The "another person visible" signal is especially important — it tells Wisp to suspend behavioral inferences, since presence of another person changes all other signals dramatically.

**Why explicit permission:** This uses the camera. Regardless of what is captured, activating a camera requires clear, separate consent.

**How to ask:** Dedicated permission screen during setup: "Wisp can estimate your heart rate using your webcam by reading tiny color changes in your face — the same way a pulse oximeter works, but without contact. No images are ever stored. Your camera would only be active while Wisp is running. Enable this for deeper physical wellbeing insights?"

**Camera indicator:** A visible indicator in the Wisp interface is always shown when the camera is active. User can disable at any time.

**Verdicts for additions:**
- Distance from screen — **KEEP.** Reliable posture and fatigue signal. Leaning in = high focus or strain. Leaning back = relaxed or distracted.
- Looking-away frequency — **KEEP.** Strong attention signal. High look-away rate correlates with difficulty concentrating.
- Head movement/nodding — **TRIM.** Interesting but noisy. Nodding can mean thinking or listening to music. Not reliably actionable alone.
- Lighting changes — **TRIM.** Useful as a "did something change in the environment" trigger but rarely a primary insight on its own.
- Another person visible — **KEEP.** Critical for data quality. Wisp must know to pause interpretation when the user is not alone.

---

### Microphone — Ambient Sound, Calls, and Environment *(DEFERRED — V3)*

| What is collected | What it is NOT |
|---|---|
| Volume level of ambient sound (loud vs quiet) | Any audio recording |
| Whether speech is present (boolean — yes or no) | Words, conversations, or content |
| General environment type (quiet, noisy, variable) | Voice identification |
| Whether music appears to be playing (boolean) | Song title, artist, or lyrics |
| Whether a video call appears to be in progress (boolean) | Call content or participants |
| Duration and frequency of call-like audio sessions | |
| Keyboard acoustic patterns (rhythm, not content) | Words or key identity |
| Duration of complete silence (no typing, no sound) | |

**What this reveals:** Whether you are working in a noisy environment, whether you are on a call (which explains all behavior anomalies during that period), whether music is helping or hurting focus, whether silence is recovery or dissociation. Call detection is particularly valuable — it tells Wisp to suspend all other behavioral inferences during the call.

**Why explicit permission:** Microphone access requires explicit consent on all operating systems regardless of what is captured.

**How to ask:** "Can Wisp listen for background noise level — not the words, just how loud or quiet your environment is — to better understand what kind of conditions you work in? No audio is ever recorded or stored."

**User can disable at any time.**

**Verdicts for additions:**
- Music detection — **KEEP.** Important context modifier. Music on + typing fast = high focus. Music off + typing slowed = different situation entirely.
- Call detection — **KEEP.** The most important addition. Call periods must be excluded from all standard behavioral models or Wisp will generate nonsense insights.
- Keyboard acoustics (acoustic rhythm) — **TRIM.** Keyboard dynamics via keystroke timing already captures this better. Acoustic version adds marginal precision at high collection cost.
- Silence duration — **KEEP.** Extended silence during a work session is either a healthy break or a dissociation/avoidance episode. Wisp can distinguish these using other signals.

---

## Derived Signals

These are not directly collected from hardware. They are computed by Wisp from combinations of the signals above. Listed here for completeness and to explain what Wisp infers.

| Derived signal | How it is computed | What it reveals |
|---|---|---|
| Error recovery speed | Time between increased deletion rate and return to normal typing pace | Resilience and frustration tolerance |
| Decision latency | Time between typing pause and next burst of activity | Confidence vs. hesitation in decision-making |
| Weekend vs. weekday work pattern | Session times mapped to calendar day type | Work-life boundary health |
| End-of-day wind-down pattern | Rate of activity decrease in the final hour of a session | Whether the user disengages naturally or pushes past limits |
| Focus session quality score | Combination of: switching frequency, notification response, typing consistency, idle time | Single score for how "in the zone" a given session was |
| Pre-meeting stress signature | Keyboard jitter and cursor speed 15–20 minutes before a calendar event | Validates the meeting-anxiety effect at an individual level |

**Wisp verdicts:**
- Error recovery speed — **KEEP.** One of the most psychologically rich derived signals. Unique to Wisp.
- Decision latency — **KEEP.** Subtle but fascinating. Reveals hesitation in a way the user would never self-report.
- Weekend/weekday pattern — **KEEP.** Directly relevant to burnout risk.
- End-of-day wind-down — **KEEP.** Important for detecting when someone's relationship with work is unhealthy.
- Focus quality score — **KEEP.** This is the single number that powers the creature's face. Core to the product.
- Pre-meeting stress signature — **KEEP.** High narrative value. "You get more anxious before meetings than you realize" is exactly the kind of revelation Wisp exists to surface.

---

## What Wisp Will Never Collect

Regardless of any permission setting, these are permanently off limits:

- The content of anything you type
- Your passwords or any credential input (automatically excluded)
- The content of your emails, messages, or documents
- Screenshots stored beyond the instant of processing
- Your location or IP address
- Any data from other users or devices
- Browser history or URLs
- File names, paths, or document contents
- Any data transmitted to a server or third party

---

## Signal Verdict Summary

A full reference of every signal, its tier, and whether it belongs in Wisp.

| Signal | Tier | Verdict |
|---|---|---|
| Keystroke timing and hold duration | 1 | KEEP |
| Backspace and delete frequency | 1 | KEEP |
| Typing pause length | 1 | KEEP |
| Typing session duration | 1 | KEEP |
| Undo / redo frequency | 1 | KEEP |
| Keyboard shortcut usage frequency | 1 | KEEP |
| Deletion-to-creation ratio | 1 | KEEP |
| Caps Lock frequency | 1 | CUT |
| Mouse movement speed and path efficiency | 1 | KEEP |
| Click frequency | 1 | KEEP |
| Micro-jitter and tremor | 1 | KEEP |
| Cursor idle time | 1 | KEEP |
| Scroll speed | 1 | KEEP |
| Scroll depth | 1 | KEEP |
| Right-click frequency | 1 | TRIM |
| Mouse text selection frequency | 1 | TRIM |
| Zoom level change frequency | 1 | CUT |
| Active application name and dwell time | 1 | KEEP |
| Application switching frequency and order | 1 | KEEP |
| System idle time | 1 | KEEP |
| CPU and memory usage level | 1 | KEEP |
| Battery drain rate | 1 | KEEP |
| Time of day | 1 | KEEP |
| Session start and end times | 1 | KEEP |
| Break duration and frequency | 1 | KEEP |
| Time-to-first-break | 1 | KEEP |
| Open window and tab count | 1 | KEEP |
| Window management patterns | 1 | TRIM |
| Notification response speed | 1 | KEEP |
| Display brightness and night mode | 1 | KEEP |
| Audio device state (headphones, volume) | 1 | KEEP |
| Power source (plugged vs. battery) | 1 | KEEP |
| Multi-monitor focus switching | 1 | KEEP |
| Network activity level | 1 | TRIM |
| File save frequency | 1 | KEEP |
| Screenshot frequency | 1 | TRIM |
| Screen content classification | 2 | KEEP |
| Clipboard action frequency | 2 | KEEP |
| Calendar context (meeting proximity and density) | 2 | KEEP |
| Heart rate (rPPG) | 3 | DEFERRED (V2) |
| Breathing rate | 3 | DEFERRED (V2) |
| Heart rate variability (stress) | 3 | DEFERRED (V2) |
| Distance from screen | 3 | DEFERRED (V2) |
| Looking-away frequency | 3 | DEFERRED (V2) |
| Head movement patterns | 3 | DEFERRED (V2) |
| Lighting change detection | 3 | DEFERRED (V2) |
| Another person in frame (boolean) | 3 | DEFERRED (V2) |
| Ambient sound level | 3 | DEFERRED (V3) |
| Speech presence (boolean) | 3 | DEFERRED (V3) |
| Environment type (quiet / noisy) | 3 | DEFERRED (V3) |
| Music playing (boolean) | 3 | DEFERRED (V3) |
| Call in progress (boolean) | 3 | DEFERRED (V3) |
| Call duration and frequency | 3 | DEFERRED (V3) |
| Keyboard acoustics | 3 | DEFERRED (V3) |
| Silence duration | 3 | DEFERRED (V3) |
| Error recovery speed | derived | KEEP |
| Decision latency | derived | KEEP |
| Weekend vs. weekday pattern | derived | KEEP |
| End-of-day wind-down pattern | derived | KEEP |
| Focus session quality score | derived | KEEP |
| Pre-meeting stress signature | derived | KEEP |

**Verdict key:**
- **KEEP** — Directly drives Wisp insights. Include in V1.
- **TRIM** — Adds nuance but is not a primary insight driver. Include passively as a context modifier, do not surface directly.
- **CUT** — Too sparse, too noisy, or too hard to interpret to justify inclusion.
- **DEFERRED (V2)** — Designed and ready, not built in V1. Webcam signals.
- **DEFERRED (V3)** — Designed and ready, not built in V1. Microphone signals.

---

## First-Run Permission Flow

When Wisp is first installed, the user goes through a short setup sequence:

**V1 flow:**
1. **Welcome screen** — explains what Wisp is and that it runs passively
2. **Tier 1 disclosure** — shows exactly what is automatically collected and why, with plain language explanations
3. **Tier 2 opt-ins** — one screen per signal group, each with a simple yes/no (screen analysis, clipboard, calendar)
4. **Summary screen** — shows exactly what Wisp will and will not collect based on the user's choices
5. **Settings reminder** — user is told they can change any of this at any time from the Wisp settings panel

The user can complete this flow in under two minutes.

**Future flow additions (V2/V3):**
- A dedicated Tier 3 screen for camera permission (with visible camera-active indicator at all times)
- A dedicated Tier 3 screen for microphone permission

---

## Ongoing Transparency

Wisp maintains a visible indicator in its interface showing which sensors are currently active. The user can open a "What Wisp knows" panel at any time to see a plain-language summary of what has been collected in the current session and what it has inferred.

Nothing about Wisp's data collection is ever hidden.
