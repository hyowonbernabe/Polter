# Wisp — Feature Reference

Every feature Wisp has or will have, organized by surface. Phase markers indicate when each feature ships.

**Phase key:**
- `V1` — Hackathon build (Windows)
- `V2` — Post-hackathon
- `V3` — Future

---

## 1. The Creature

The creature is the product. Everything else serves it.

### Appearance
- `V1` Lives as a transparent, always-on-top overlay on the desktop. No window chrome. No border.
- `V1` 7 mood states, each with a distinct wing position and body color — focus, calm, deep, spark, burn, fade, rest
- `V1` Body color shifts with state — cool blue-grey (neutral), warm amber (high energy), dim grey-violet (fatigued)
- `V1` Glow and bloom effect around the creature matches its current state color
- `V1` Breathing animation — a slow 4-second scale pulse, always running. The creature is always alive.
- `V1` Wing state is the primary emotional signal — spread wide, drooping, tucked, raised, flared
- `V1` State transitions animate smoothly — the creature crossfades between states, never snaps
- `V1` Dims to low opacity during idle periods — fades into the wallpaper when nothing is happening, sharpens when activity resumes
- `V1` "Still learning" visual during cold start — a distinct neutral appearance with a subtle question-mark energy, before a personal baseline exists
- `V2` Additional creature variants — different wing shapes or body styles (cosmetic only, same state logic)

### Position and Size
- `V1` Default position: bottom-right corner of the primary monitor
- `V1` User can drag the creature to any position on screen
- `V1` Persists position across restarts
- `V1` Size options: small (64px), medium (96px), large (128px) — set in settings
- `V1` Multi-monitor awareness — tracks which monitor it lives on, stays there
- `V1` Screen edge snapping — when dragged close to an edge, snaps to it cleanly
- `V2` Can be moved between monitors by dragging across the edge

### Behavior States
- `V1` Pulses softly with a brief glow before a chat bubble appears — a tell that it is about to speak
- `V1` Sleep mode appearance — wings fully folded, glow extinguished, breathing slows to nearly imperceptible. Looks genuinely asleep.
- `V1` Reacts visibly when woken from sleep — wings unfurl, glow returns, small stretch animation
- `V1` Extended burn state warning — after 90+ minutes in "burn", the creature shows visible distress (trembling wings, deeper red glow)
- `V1` Best session recognition — when the current focus session surpasses the user's personal record, the creature enters a special brightened state briefly
- `V1` "Returning" behavior — if the user has been away for more than 4 hours and returns, the creature performs a small wake-up/greeting animation
- `V1` Idle wandering — after extended idle time with no collection activity, the creature slowly drifts a few pixels, as if restless

---

## 2. Creature Interactions

The creature is a physical object on the screen. It responds to how the user handles it.

### Click
- `V1` Single click — creature reacts as if tapped. A small bounce, wings flutter briefly, looks toward the cursor
- `V1` Double click — stronger reaction — surprised wing flare, a small jump
- `V1` Click while a chat bubble is visible — dismisses the bubble, creature gives a small nod
- `V1` Click during "burn" or "fade" state — a slightly different reaction, heavier, like it took effort to respond
- `V1` Click during "deep" flow state — a gentle reaction so as not to disrupt, wings barely shift

### Hover
- `V1` Hovering over the creature reveals a small pixel-font label showing the current state name (e.g. "focusing") and how long it has been in that state
- `V1` Hover causes a subtle brightening of the glow — creature becomes aware of the cursor
- `V1` Cursor moving slowly across the creature ("petting") triggers a content reaction — wings settle, breathing slows further, brief color warmth

### Drag and Physics
- `V1` Clicking and holding begins a drag — the creature visually reacts to being picked up (wings spread slightly, body squishes on grab)
- `V1` While being dragged, the creature trails slightly behind the cursor — a soft lag that makes it feel physical
- `V1` Slow drag — creature floats calmly, wings relaxed
- `V1` Fast drag — creature stretches in the direction of movement, wings pulled back, eyes wide
- `V1` Release with low velocity — creature settles gently into the new position with a small landing bounce
- `V1` Release with high velocity (throw) — creature flies across the screen maintaining momentum, decelerates naturally, lands with a larger bounce and settle
- `V1` Screen edge collision — if thrown toward a screen edge, the creature bumps into it and bounces back slightly, then settles near the edge
- `V1` Landing on the taskbar area — creature settles just above it, does not go behind it
- `V1` Post-landing shake — after a hard landing the creature shakes itself off, a small recovery animation

### Right-Click
- `V1` Right-clicking the creature opens a minimal context menu:
  - Sleep / Wake
  - Dismiss current bubble (if one is showing)
  - Open dashboard (via tray)
  - Settings
  - Quit Wisp

---

## 3. Insights — Chat Bubbles

Insights are things Wisp says. They appear as speech bubbles originating from the creature — not floating cards, not notifications. The tail of the bubble points to Wisp.

### Bubble Appearance
- `V1` Chat bubble blooms in from the creature's position — a frosted glass panel with a directional tail pointing toward Wisp
- `V1` Bubble positioning is intelligent — it always appears on whichever side has more screen space, never clips off the edge
- `V1` If the creature is near the top of the screen, bubble appears below. Near the bottom, it appears above.
- `V1` Bubble contains: state pip, "noticed" pixel label, the insight sentence, a timestamp, and two actions
- `V1` Insight text is written in Wisp's voice — lowercase, second person, observational, specific, never prescriptive
- `V1` Bubble fades in over 600ms with a slight upward drift
- `V1` Bubble auto-dismisses after 45 seconds if the user does not interact with it
- `V1` Auto-dismiss is smooth — fades out gently, creature gives a small shrug animation

### Bubble Actions
- `V1` **"tell me more"** — expands the bubble to show a 2–3 sentence deeper explanation of the insight. The extended text is pre-generated alongside the main insight, not a new API call.
- `V1` **"ok"** — dismisses the bubble. Creature nods slightly.
- `V1` Dismissed insights are moved to the insight history in the dashboard

### Insight Generation Rules
- `V1` Insights only generate after a minimum of 5 minutes of active behavioral data — never on sparse readings
- `V1` No daily cap on bubbles. Wisp decides each tick whether to produce an insight or a mutter. Deduplication prevents repetition of the same insight type.
- `V1` Insights do not appear during sleep mode
- `V1` Insights queue — if one is generated while a bubble is already showing, it waits. Bubbles never stack.
- `V1` Insights generated while the user is AFK surface when activity resumes, but only if they are still relevant (recent enough)
- `V1` The very first insight ever is distinct — Wisp has been watching long enough to say something true for the first time. The bubble has a slightly longer pause before appearing, the creature glows more intensely.

### Types of Insights
- `V1` **Flow detection** — "you've held one window for forty-three minutes. that's the longest you've gone all week."
- `V1` **Fatigue signals** — "your accuracy has been declining for forty minutes. this is the third time today around this hour."
- `V1` **Pattern revelations** — "three tuesdays in a row, you've slowed down after 2pm."
- `V1` **Avoidance detection** — "you've opened and closed the same app four times this morning without doing anything in it."
- `V1` **Peak performance** — "your deepest work happens before 10am. you scheduled a meeting there this week."
- `V1` **Stress tells** — "you're typing forty percent faster than usual but making twice as many mistakes."
- `V1` **Anomalies** — "this is the most scattered hour you've had this month."
- `V1` **Break signals** — "you haven't stopped in three hours. your focus has been slipping for the last forty minutes."
- `V1` **Comparative** — "today is unusually focused. you've barely switched apps. that's not typical for a monday."
- `V1` **Long absence return** — "you were gone for four days. your first hour back looks calmer than usual."
- `V2` **Calendar-aware** — "your jitter spiked fifteen minutes before the call. it does that."
- `V2` **Milestone observations** — after 30 days: "a full month. your baseline has settled. the patterns are clearer now."
- `V2` **Streak acknowledgment** — "you've been consistent for two weeks. your average focus block has grown by eight minutes."

### Insight Deduplication
- `V1` Wisp tracks the last 10 insight topics surfaced. It will not repeat the same theme within 48 hours.
- `V1` Insights are scored for novelty before surfacing — a well-established pattern is only mentioned again if it changes

---

## 4. The Dashboard

Accessed exclusively through the system tray. Not triggered by clicking the creature — the creature is for interaction, not navigation.

### Opening and Closing
- `V1` System tray icon → "Open dashboard"
- `V1` Panel blooms in from the tray corner with the same frosted glass treatment as the bubble
- `V1` Click anywhere outside the panel to close, or use the × button
- `V1` Dashboard pins to a corner of the screen — which corner follows the creature's side

### Content
- `V1` **State header** — current state pip, state label, how long in this state
- `V1` **Today at a glance** — total active time, longest focus block today, number of insights today
- `V1` **7-day activity chart** — stacked bar chart. Each day: focus (blue), deep (purple), burn (amber) minutes. Bars are proportional to max day.
- `V1` **Personal bests** — longest focus session ever, best single day this week (most focus time)
- `V1` **State distribution this week** — how much time in each state, shown as a horizontal bar breakdown
- `V1` **Insight history** — all past bubbles in reverse chronological order, with timestamps. Scrollable. Tapping one re-reads it in full.
- `V1` **"What Wisp knows right now"** — plain language summary: "In the last hour, Wisp has recorded your typing rhythm, mouse movement, and which apps have been open. It has not read any content. Here is what it has inferred..."
- `V1` **Day-one empty state** — when there is no history, the chart shows a calm empty state with a message: "wisp is watching. come back tomorrow."
- `V2` **Weekly patterns view** — heatmap or chart showing which days and time-of-day slots are consistently your best and worst
- `V2` **Trend lines** — is your average focus block getting longer or shorter over time?

### Dashboard Controls
- `V1` Settings button (gear icon) — opens settings panel
- `V1` Sleep button (moon icon) — puts Wisp to sleep from the dashboard
- `V1` Close button (×)

---

## 5. Settings

Accessed from the dashboard or from the system tray right-click menu.

### Inference
- `V1` **Inference mode badge** — always visible at the top of settings. Shows "local" (Ollama running) or "cloud" (OpenRouter). Not a setting — just always shown.
- `V1` **OpenRouter API key** — text input. If Ollama is not running and no key is entered, Wisp shows a "no AI" state where the creature still reflects behavior but no bubble insights are generated.
- `V1` **Preferred model** — dropdown to select which Ollama model or OpenRouter model to use (for advanced users)

### Data Collection
- `V1` **Screen content analysis** — toggle (Tier 2). On/off with a plain-language description.
- `V1` **Clipboard activity** — toggle (Tier 2). On/off.
- `V1` **Calendar context** — toggle (Tier 2). On/off. Shows current calendar connection status.
- `V1` **Active sensors indicator** — small list showing every signal currently being collected, in plain language

### Insights
- `V2` **Insight frequency** — slider: adjust how often Wisp speaks (reserved for future tuning)
- `V1` **Sound** — toggle: a soft chime plays when a bubble appears (off by default)

### Creature
- `V1` **Size** — small / medium / large
- `V1` **Default corner** — top-left / top-right / bottom-left / bottom-right
- `V1` **Idle opacity** — how faded the creature becomes during long idle periods (30% / 50% / 70%)

### System
- `V1` **Launch at startup** — toggle. On by default.
- `V1` **Sleep schedule** — set a time range for Wisp to sleep automatically (e.g. after 11pm, before 7am)

### Data and Privacy
- `V1` **Clear raw data** — deletes all behavioral snapshots. Keeps insight history. Irreversible — confirmation required.
- `V1` **Export insights** — downloads all insight text as a plain .txt file
- `V1` **Data retention** — shows current retention periods, links to a plain-language explanation
- `V1` **Privacy mode shortcut** — assign a keyboard shortcut to instantly pause all collection (for sensitive work)

---

## 6. System Tray

The tray icon is Wisp's background presence when the creature is not visible or the user is not looking at it.

- `V1` Tray icon is the Wisp creature icon, small
- `V1` Tray icon reflects current state color — shifts between blue, amber, grey to match creature
- `V1` Left-click tray icon — shows/hides the creature overlay
- `V1` Right-click tray menu:
  - Open dashboard
  - Sleep / Wake Wisp
  - Privacy mode (pause collection)
  - Settings
  - Quit Wisp
- `V1` Tray icon gets a subtle indicator dot when a new insight is waiting (for when the creature is hidden or covered)

---

## 7. Onboarding

The first-run experience. Everything here builds trust before a single byte of data is collected.

- `V1` **Welcome screen** — what Wisp is in two short paragraphs. No technical language. No bullet points. A statement of intent.
- `V1` **What Wisp watches** — a simple screen showing Tier 1 signals in plain language: "Wisp watches how you type and move your mouse. Not what you type — how you do it." Shown before collection starts.
- `V1` **Tier 2 opt-ins** — three separate screens, one per signal: screen content, clipboard, calendar. Each has: what it collects, what it does NOT collect, and a yes/no toggle. User can skip all three.
- `V1` **Summary screen** — shows exactly what Wisp will and will not collect based on choices just made. A confirmation, not a re-ask.
- `V1` **Creature introduction** — the creature appears on screen for the first time at the end of onboarding. It starts in a calm state, breathes, and the user sees it settle into the corner. No instruction needed — it just appears.
- `V1` **"Still learning" acknowledgment** — the creature shows its learning visual, and a one-time bubble appears: "give me a few days. i'll tell you something when i know something."
- `V1` **Settings reminder** — a small note at the end: "you can change any of this in settings, any time."
- `V1` Onboarding completes in under two minutes
- `V1` Onboarding can be revisited from settings ("review permissions")

---

## 8. Privacy and Transparency

These are features visible to the user — not just policy statements.

- `V1` **Inference mode badge** — visible in settings and optionally as a tiny label near the creature when hovered. Shows "local" or "cloud" at all times.
- `V1` **"What Wisp knows" panel** — inside the dashboard. Plain language. "Here is everything Wisp has collected in the last hour and what it has inferred from it."
- `V1` **Active sensor list** — in settings, a live list of which signals are currently running
- `V1` **Zero transmission statement** — visible in the "what Wisp knows" panel: "none of this has left your device."
- `V1` **Cloud inference consent** — if Wisp attempts to use OpenRouter and the user has not explicitly acknowledged that behavioral descriptions will leave the device, it asks first. One time, stored. Not asked again unless the setting changes.
- `V1` **Privacy mode** — instantly pauses all collection. Creature enters a distinct "paused" state (greyed out, wings tucked differently from sleep). No data is collected while paused. Easily visible to the user that collection is stopped.
- `V1` **No account required** — Wisp functions entirely without a login. Stated on the welcome screen.
- `V1` **Data deletion** — one-tap clear of all raw behavioral data. Confirmation dialog with plain language about what gets deleted vs what stays (insight text).

---

## 9. "No AI" State

When neither Ollama nor OpenRouter is available, Wisp degrades gracefully.

- `V1` The creature still runs and reflects behavioral state — state machine uses rule-based logic, no AI needed
- `V1` The creature's mood still updates in real time based on collected signals
- `V1` No chat bubbles are generated — Wisp goes quiet. It watches but does not speak.
- `V1` A small indicator (in the tray or on hover) shows that insights are currently unavailable
- `V1` When Ollama becomes available mid-session (user installs it), Wisp detects it within 60 seconds and resumes insight generation without restart
- `V1` The dashboard still shows the activity chart and state history — just no insight text

---

## 10. Future Features (V2 / V3)

Designed but not built in V1. Documented here so they are not forgotten.

### V2
- Webcam: distance from screen, looking-away frequency, presence detection (is someone else visible)
- rPPG heart rate from webcam (if technically feasible — see OPENQUESTIONS.md)
- ONNX Runtime local ML models for real-time behavioral scoring without LLM dependency
- Mac port
- Weekly pattern heatmap in dashboard
- Calendar integration (meeting proximity → stress signature detection)
- Milestone and streak insights
- Additional creature cosmetic variants

### V3
- Microphone: ambient sound level, call detection, music detection
- Mobile companion app (iOS / Android) — shows creature on phone, syncs insights
- Cross-device baseline (if the user opts in to sync)

---

## Gaps and Questions Still Open

Features that need design decisions before they can be built — parked in OPENQUESTIONS.md:

- Cold start experience (Q7) — exactly what the "still learning" visual looks like and for how long
- State transition rules (Q5) — the actual behavioral thresholds that drive each state
- "Tell me more" content (Q14) — whether this is pre-generated or a second AI call
- Bubble queue behavior (Q4) — how stale an insight becomes before it is discarded
- Insight deduplication logic (Q15) — topic tracking implementation
- Dashboard empty state design (Q24) — exact copy and layout for day one
- Privacy mode visual (above) — distinct from sleep, needs its own sprite state consideration
