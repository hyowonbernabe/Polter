# Wisp — Creature Physics and Behavior Reference

This document covers the full design of the creature's movement, physics, animation, and interaction systems. Read this before touching anything in `useCreaturePhysics`, `useCreatureAnimation`, `Creature.tsx`, or any file that affects how the creature moves or reacts.

---

## Overview

The creature is a pixel art winged companion that flies autonomously around the screen, lands on edges, reacts to user interaction, and eventually will be rebranded as a butterfly. The physics system is designed around that future state — butterfly behaviors and states are named and stubbed throughout, ready for new sprites to drop in without touching logic.

The creature's behavior layers from bottom to top:

1. **Physics loop** — position, velocity, collision, simplex-noise wander (runs at 60fps in a `requestAnimationFrame` loop)
2. **Physics state machine** — what the creature is *doing* (wander, grabbed, stunned, perching, etc.)
3. **Animation state machine** — which sprite animation plays, driven by physics state + velocity magnitude
4. **Mood modifier** — the creature's Wisp mental state (Calm, Focus, Burn, etc.) tunes physics parameters without changing states

These layers are independent. The physics loop does not know about sprites. The animation system does not run physics. Mood parameters are read-only inputs to the physics loop.

---

## Critical Implementation Rule: No React State for Position

**Position and velocity must never live in React `useState`.** Physics runs at 60fps — putting position in state causes 60 React re-renders per second of the full component tree. This is wasteful for a persistent background overlay.

**The rule:** Position and velocity live in `useRef`. The physics loop mutates the creature's DOM element directly via `element.style.transform`. React never touches position at 60fps.

Persistence still works: the physics loop debounce-syncs position to the Tauri store every ~2 seconds, saved as percentage of work area (same as before).

---

## Dependencies

| Package | Version | Use |
|---|---|---|
| `simplex-noise` | 4.0.3 | Organic flight path generation — `noise2D(time * FREQ, 0)` drives steering |
| `motion` (formerly `framer-motion`) | current | Drag velocity capture on release only — `onDragEnd` gives `info.velocity` |

Do not add matter-js, rapier, planck, cannon-es, or any full physics engine. The math for a single entity with four wall boundaries does not need a simulation library.

---

## Physics State Machine

The creature is always in exactly one physics state. State transitions are the physics loop's responsibility — the animation system reads the current state passively.

```typescript
type PhysicsState =
  // --- Autonomous flight ---
  | 'wander'       // Default. Simplex-noise steering, lazy arcs, burst-coast rhythm
  | 'glide'        // Coast phase within wander — wings flat, slight altitude loss
  | 'burst'        // Sudden acceleration — wing-clap surge, 1-2 body lengths forward
  | 'fly_idle'     // Stationary hover — wings beating in place, position nearly unchanged. Triggered by intent, not just low speed.
  | 'hover'        // Nearly stationary — nose pitched up 30-40°, jagged corrections. Physics-driven low speed.
  | 'cruise'       // Purposeful flight toward a soft target point
  | 'evade'        // Erratic evasion — sharp 30-90° jinks, triggered by fast cursor
  | 'spiral'       // Ascending corkscrew orbit (territorial / playful)
  | 'patrol'       // Back-and-forth sweep along an edge

  // --- Landing sequence ---
  | 'approach'     // Descending arc toward a surface, wings spread wide, beats slow
  | 'land_impact'  // Frame of landing contact — squash, wing bounce-open
  | 'perching'     // On a surface — wing settle, then idle micro-animations

  // --- Re-launch ---
  | 'relaunch'     // Explosive upward impulse from perch, transitions to burst → wander

  // --- User interaction ---
  | 'grabbed'      // User holding the creature — physics loop paused, motion library owns position
  | 'thrown'       // Released with velocity — carries momentum, bounces off walls
  | 'stunned'      // Hit wall above velocity threshold — tumbles/falls
  | 'recovering'   // Regaining flight after stun — slow upward drift, transitions to wander

  // --- Reactions ---
  | 'click_react'  // Startled by single click — velocity impulse away from click origin
  | 'bubble_ack'   // Acknowledging bubble dismiss — small nod / settle
  | 'dialogue'     // Bubble is visible — forward-facing sprite shown, creature slows to fly_idle or hover
```

### State Transition Rules

| From | To | Trigger |
|---|---|---|
| `wander` | `fly_idle` | Random pause mid-flight (every 8-25s), OR approaching potential landing surface, OR before direction reversal. Holds 0.8-3s then returns to `wander` or transitions to `approach` |
| `wander` | `glide` | Every 2-4 flap cycles; holds for ~0.3s |
| `wander` | `burst` | Random impulse OR re-entry from stun/relaunch |
| `wander` / `glide` | `hover` | Speed drops below `HOVER_THRESHOLD` (20 px/s) for > 0.5s |
| `wander` | `cruise` | Soft target assigned (screen-center gravity, slow cursor attraction) |
| `wander` | `evade` | Cursor velocity exceeds `FAST_CURSOR_THRESHOLD` |
| `wander` | `approach` | Landing timer fires (random 45-120s of flight) |
| `wander` / `glide` / `cruise` | `grabbed` | `onDragStart` fires |
| `grabbed` | `thrown` | `onDragEnd` fires; velocity from `info.velocity` handed to physics loop |
| `thrown` | `stunned` | Collision at speed ≥ `STUN_VELOCITY_THRESHOLD` (250 px/s) |
| `thrown` | `wander` | Speed decays below `FLIGHT_RESUME_THRESHOLD` (60 px/s) |
| `stunned` | `recovering` | After stun animation completes (~0.8s) |
| `recovering` | `wander` | Upward velocity established and sustained > 0.5s |
| `approach` | `land_impact` | Creature reaches surface within `LAND_DISTANCE` (8px) |
| `land_impact` | `perching` | Impact animation completes (~0.3s) |
| `perching` | `relaunch` | Perch timer fires (random 4-20s) OR click on creature |
| `relaunch` | `burst` | Re-launch animation completes |
| Any flight state | `dialogue` | `insight_ready` event fires (bubble becomes visible) — creature transitions to fly_idle/hover + forward-facing sprite |
| `dialogue` | previous flight state | Bubble dismissed — creature resumes facing left/right, resumes `wander` |
| `wander` / `hover` | `click_react` | Click on creature |
| `click_react` | `wander` | Reaction animation completes (~0.5s) |
| Any flight state | `bubble_ack` | Creature clicked while bubble is visible; emits `dismiss_bubble` event |
| `bubble_ack` | `wander` | Ack animation completes (~0.4s) |

### Locked Transitions

States marked **locked** must complete their animation before the state machine evaluates the next state. States marked **interruptible** cut immediately on urgent events.

| State | Lock behavior |
|---|---|
| `land_impact` | Locked — finish before transitioning to `perching` |
| `perching` (wing settle) | Locked for first 1.2s — finish wing settle before idle begins |
| `relaunch` | Locked — finish full launch animation |
| `stunned` | Locked for 0.8s — forced tumble completes |
| `wander` / `glide` / `cruise` | Interruptible — any event can cut immediately |
| `grabbed` | Interruptible — `onDragEnd` cuts immediately |

---

## Flight Algorithm

### Simplex Noise Wander

The default flight path uses Reynolds' wander behavior driven by simplex noise instead of random perturbation. This produces smooth, organic, unpredictable arcs without the diagonal bias of Perlin noise.

```typescript
// Each frame (dt = elapsed ms since last frame):
const noiseX = simplex.noise2D(noiseT * FREQ, 0)       // -1 to 1
const noiseY = simplex.noise2D(0, noiseT * FREQ)       // -1 to 1
noiseT += dt

const desiredVel = normalize({ x: noiseX, y: noiseY })
steer = clamp(desiredVel * MAX_SPEED - velocity, MAX_FORCE)
velocity = clamp(velocity + steer * dt, MAX_SPEED)
position = position + velocity * dt
```

**Tuning constants** (baseline — overridden by mood modifier):

| Constant | Default | Effect |
|---|---|---|
| `FREQ` | `0.0005` per ms | Lower = long lazy arcs. Higher = erratic darting |
| `MAX_SPEED` | `80 px/s` | Peak cruise speed |
| `MAX_FORCE` | `120 px/s²` | Steering responsiveness. Low = floaty, High = agile |
| `HOVER_THRESHOLD` | `20 px/s` | Speed below which hover state triggers |
| `FLIGHT_RESUME_THRESHOLD` | `60 px/s` | Speed below which thrown creature resumes wander |

### Burst-Coast Rhythm

Real butterflies don't fly at constant speed — they burst-flap then coast. This is layered on top of the noise wander:

- Every `BURST_INTERVAL` ms (random 1200-2400ms), apply a brief `MAX_SPEED * 1.8` multiplier for 150ms
- Between bursts, apply a `COAST_DRAG` multiplier (0.85) that bleeds speed toward a natural cruise
- This produces the characteristic "flap-flap-glide" rhythm without changing the direction logic

### Soft Attractor System (Secondary Influence)

Three weak forces layer on top of the noise wander. Each is a small additive velocity contribution, not a force override:

**Screen-center gravity (5% weight):**
```typescript
const centerPull = normalize(screenCenter - position) * CENTER_PULL_STRENGTH  // 8 px/s
```
Prevents the creature from spending minutes in one corner. Very subtle — barely perceptible.

**Slow cursor attraction (15% weight, conditional):**
```typescript
// Only active when cursor speed < SLOW_CURSOR_THRESHOLD (80 px/s)
const cursorPull = normalize(cursorPos - position) * CURSOR_ATTRACT_STRENGTH  // 15 px/s max
```
When cursor is idle or moving slowly, creature drifts vaguely toward it — like a butterfly near a warm hand.

**Fast cursor repulsion (15% weight, conditional):**
```typescript
// Only active when cursor speed >= FAST_CURSOR_THRESHOLD (200 px/s)
// Triggers evade state
```
Sudden fast cursor movement triggers `evade` state — erratic jinks away from cursor.

---

## Collision and Edge Handling

### Soft Avoidance (Edge-Follow)

Before reaching a wall, the creature's noise field is biased away from it. When `position.x` is within `EDGE_AVOID_MARGIN` (80px) of any wall, a repulsive force bends the flight path in a wide arc parallel to the edge — the creature curves away without bouncing. This is how real butterflies navigate walls.

### Hard Collision

If the creature reaches the wall despite avoidance (thrown, or avoidance failed):

```typescript
// Right wall example:
if (pos.x + SPRITE_W > WORK_AREA_W) {
  pos.x = WORK_AREA_W - SPRITE_W
  vel.x *= -RESTITUTION          // 0.55 for soft bounce
  if (Math.abs(vel.x) < MIN_BOUNCE_SPEED) vel.x = 0
}
```

**Velocity at collision determines outcome:**

| Velocity at impact | Outcome |
|---|---|
| ≥ `STUN_VELOCITY_THRESHOLD` (250 px/s) | → `stunned` state. Creature tumbles, falls with gravity applied |
| < threshold | Elastic bounce. Continues in `thrown` or `wander` |

### Work Area Constraint

Always use **work area** dimensions, never screen dimensions. The Windows taskbar is excluded. Source: `currentMonitor().workArea` from Tauri — already available in the codebase via `get_monitors` command.

DPI note: all position math uses CSS logical pixels. The `spriteDisplaySize()` function already handles DPI-aware sprite scaling correctly — do not change it.

---

## Landing System

### Landing Trigger

While in `wander`, a landing timer ticks down. When it fires, the creature picks the nearest valid landing surface (bottom edge, either side, or top edge) and transitions to `approach`. Timer range: 45-120s, randomized on each re-launch.

Landing can also be triggered by stun — when the creature is stunned near a surface it falls onto it.

### Approach Phases

1. **`approach`** — creature curves in a shallow descending arc toward the target surface. Wing beats slow and widen. Nose-high attitude (body pitched up) in the final 40px.
2. **`land_impact`** — contact frame. Squash: `scaleY: 0.7, scaleX: 1.2` over 80ms, ease back to `1, 1` over 120ms.
3. **`perching`** — wing settle animation plays (slow open-to-fold, ~1.2s). Then transitions to idle micro-animations.

### Surface Tracking

Track which surface the creature is on:

```typescript
type PerchSurface = 'bottom' | 'top' | 'left' | 'right'
```

This drives:
- Which direction the sprite faces while perched
- The direction of the re-launch velocity impulse
- The orientation of the wing settle animation (wings fold differently on a side wall vs floor)

### Perch Idle Behaviors

While perching, randomly select from a weighted pool each time the previous idle behavior completes:

| Behavior | Weight | Description |
|---|---|---|
| `SLOW_PUMP` | 40% | Wings open and close slowly, 2-4s per cycle |
| `BASK_OPEN` | 25% | Wings fully spread, complete stillness |
| `BODY_ROCK` | 15% | Subtle whole-body sway |
| `WING_SHIVER` | 10% | High-frequency micro-vibration (cold/tired mood) |
| `ANTENNAE_CURL` | 10% | Subtle antennae movement (future: requires antennae in sprite) |

### Re-launch

Triggered by perch timer or click. `ESCAPE_CLIMB` pattern: explosive upward impulse (`vel.y = -RELAUNCH_SPEED`), body pitches steeply upward, transitions to `burst` then `wander`.

---

## Drag Physics

### Pickup

On `onDragStart`:
- Set physics state to `grabbed`
- Pause rAF position updates — `motion` library owns position during drag
- Play squish: `scaleX: 0.8, scaleY: 1.2` snap (80ms ease-out), wings spread animation

### Carry

While dragging (`whileDrag` / tracking pointer velocity):
- Read drag velocity vector from motion's `useVelocity`
- Apply directional stretch proportional to speed (capped at 1.4x):
  - Moving right fast: `scaleX: 1.35, scaleY: 0.75`
  - Moving left fast: `scaleX: 1.35, scaleY: 0.75` (mirrored)
  - Moving down fast: `scaleX: 0.8, scaleY: 1.3`
- The sprite flips direction based on horizontal drag velocity

### Release

On `onDragEnd`:
- Read `info.velocity` from motion (accurate pointer velocity at release)
- Hand `{ vx: info.velocity.x, vy: info.velocity.y }` to physics loop as initial velocity
- Set physics state to `thrown`
- Physics loop takes over; motion library releases position ownership
- Ease squish back to `1, 1` over 100ms

### Velocity Thresholds

| Release speed | Outcome |
|---|---|
| < 60 px/s | Creature barely moves, transitions to `wander` immediately |
| 60-250 px/s | Normal throw — carries momentum, bounces, decelerates into `wander` |
| > 250 px/s | Throw + collision risk — if it hits a wall at this speed, `stunned` triggers |

---

## Interaction Events

### Single Click

- If physics state is a flight state: `click_react`
  - Velocity impulse away from click origin: `normalize(pos - clickPos) * 180 px/s`
  - Wing flutter (rapid frame cycle for 300ms)
  - Slight rotation: `rotate: ±18deg` spring animation, back to 0
- If physics state is `perching`: triggers `relaunch`
- If `Focus` or `Deep` Wisp state: gentler reaction (`* 0.4` impulse multiplier) — creature barely notices

### Click During Bubble

- Creature clicked while a bubble is visible → emit Tauri event `dismiss_bubble`
- Transition to `bubble_ack` state: small nod (brief `scaleY: 1.1` then back)
- Resume previous flight state after 0.4s

### Double Click

- Wing flare: immediate snap to maximum spread pose
- `burst` state entry with upward bias
- Stronger rotation: `rotate: ±30deg`

### Slow Cursor Hover (Petting)

- When cursor moves at < 40 px/s within `SPRITE_W + 20px` of creature center for > 1.5s
- Transition toward `hover` state
- Play content/settled animation (gentle, slower wing beats, body relaxes)
- `BODY_ROCK` micro-behavior activates while being petted

### Right-Click Context Menu

Minimal, creature-aware. Items shown:

```
[Current Wisp state label, e.g. "Deep Focus"]   ← read-only label, no action
─────────────────────────────────────
Dismiss bubble                                   ← only shown if bubble is visible
─────────────────────────────────────
Open Dashboard
Sleep / Wake
─────────────────────────────────────
Quit
```

Rendered as a React component (`CreatureContextMenu.tsx`) positioned at cursor. Suppress default browser context menu via `e.preventDefault()` on `onContextMenu`.

---

## Mood Modifier System

The creature's Wisp mental state (from the Rust state machine, delivered via `state_changed` event) tunes physics parameters. It does not change the FSM — it changes how the FSM behaves.

| Wisp State | Modifier Name | Flight feel |
|---|---|---|
| `calm` | RELAXED | `MAX_SPEED * 0.7`, `FREQ * 0.7`, longer coasts, more perch time |
| `focus` | ACTIVE | `MAX_SPEED * 1.0` (baseline), regular rhythm |
| `deep` | CONCENTRATED | `MAX_SPEED * 0.85`, straighter paths, less erratic — creature seems intent |
| `spark` | EXCITED | `MAX_SPEED * 1.4`, `FREQ * 1.5`, shorter coasts, more burst-surges, less perch time |
| `burn` | ALERT | `MAX_SPEED * 1.2`, `FREQ * 1.3`, more `evade` triggers, erratic jinks in wander path |
| `fade` | TIRED | `MAX_SPEED * 0.5`, `FREQ * 0.5`, long coasts, frequent landing, longer perch time |
| `rest` | COLD | `MAX_SPEED * 0.3`, nearly stationary, almost always perching, `WING_SHIVER` idle |

Parameters lerp toward new targets over 3 seconds on state change — no snapping.

---

## Animation State Machine

Driven by physics state + velocity magnitude. The canvas animation system reads this and selects which spritesheet row/strip to play.

```typescript
type AnimState =
  | 'forward_facing'  // Facing user — only during active dialogue (bubble visible)
  | 'fly_idle'        // Stationary hover in place — wings beating, body nearly still, no translation
  | 'idle_float'      // Speed < 20 px/s in wander. Drifting very slowly, minimal wing movement

// fly_idle vs hover distinction:
// hover   = physics-driven low speed (wander slowed down, nose pitches up naturally)
// fly_idle = intentional stationary beat — creature is fully stopped, wings beating in place.
//            Triggered as a deliberate pause: before a direction change, near a potential
//            landing surface, or randomly mid-flight as a behavior variant. Position barely
//            changes during fly_idle — max drift ±4px from entry position.
  | 'fly_slow'        // Speed 20-80 px/s. Normal wing cadence
  | 'fly_fast'        // Speed 80-200 px/s. Faster wing beats, body tilts forward
  | 'fly_burst'       // Speed > 200 px/s. Wing-clap snap, compressed beats
  | 'tilt_left'       // Turning left — hold banked-left pose for 3-5 frames
  | 'tilt_right'      // Turning right — hold banked-right pose for 3-5 frames
  | 'hover'           // Nose-up 30-40°, jagged stationary hold, continuous beats
  | 'glide_coast'     // Wings flat, slight nose-down, brief coast frames
  | 'approach_land'   // Descending arc: wings spread wide, beats slowing
  | 'land_impact'     // Contact squash frame
  | 'perch_settle'    // Slow wing open-to-fold (or fold-to-open), 1.2s
  | 'perch_bask'      // Wings fully flat, stillness
  | 'perch_pump'      // Slow open-close cycle, 2-4s rhythm
  | 'perch_shiver'    // High-frequency micro-vibration
  | 'perch_alert'     // Snap-open wings, held alert pose
  | 'relaunch'        // Explosive upward first-beats
  | 'grabbed'         // Squish: scaleX 0.8, scaleY 1.2
  | 'drag_slow'       // Slight stretch in drag direction
  | 'drag_fast'       // Strong stretch: scaleX 1.35, scaleY 0.75
  | 'stunned'         // Tumbling — rapid rotation, falling
  | 'recovering'      // Slow upward drift, wings partially open
  | 'click_react'     // Wing flutter + velocity impulse
  | 'double_click'    // Wing flare snap to full spread
  | 'bubble_ack'      // Small nod
  | 'being_petted'    // Settled, slowed, body relaxed
```

### Sprite Direction

The creature has three facing orientations:

| Orientation | When used |
|---|---|
| **Left-facing** | Flying left, perching on right wall |
| **Right-facing** | Flying right, perching on left wall — free horizontal flip of left-facing via `ctx.scale(-1, 1)` |
| **Forward-facing** | The current Wisp sprite. Only shown during dialogue (bubble visible). This is the creature "looking at" the user. |

During all flight, drag, landing, and perching states — the creature shows left or right facing, never forward. Forward-facing is reserved exclusively for the moment a bubble appears and while it is visible. On bubble dismiss, the creature rotates back to whichever side it was last facing.

Flip direction is determined by `velocity.x` sign during flight, or the last horizontal velocity before landing while perching. A creature perched on the bottom edge that was flying left faces left.

### Wing Beat Rate Scaling

Rather than separate sprite strips for slow/fast flight, playback rate scales with speed:

```typescript
const playbackRate = 1.0 + (speed - 80) / 200  // 1.0x at 80px/s, 1.5x at 180px/s
const frameDuration = BASE_FRAME_MS / playbackRate
```

This means one well-animated flight strip reads correctly across the full speed range.

### States Without Dedicated Sprites Yet

Until butterfly sprites are delivered, these states fall back to the nearest existing Wisp frame:

| Target anim state | Current fallback |
|---|---|
| `hover` | `idle_float` |
| `glide_coast` | `fly_slow` |
| `approach_land` | `fly_slow` |
| `land_impact` | Use CSS transform squash — no sprite needed |
| `perch_settle` | `idle_float` |
| `perch_bask` | `idle_float` |
| `perch_pump` | `idle_float` |
| `perch_shiver` | `idle_float` |
| `perch_alert` | Current state sprite |
| `stunned` | `burn` state sprite |
| `recovering` | `fade` state sprite |
| `being_petted` | `calm` state sprite |

---

## Butterfly Behavior Reference

The full catalog of real butterfly behaviors that the creature's states are modeled on. Implementation priority marked.

### Flight

| Behavior | States it maps to | Priority |
|---|---|---|
| WANDER_DRIFT — slow erratic arcs, burst-coast | `wander` + `glide` | V1 |
| GLIDE_COAST — wings flat, brief altitude loss | `glide_coast` anim | V1 |
| BURST_SURGE — wing-clap lurch, 1-2 body lengths | `burst` | V1 |
| PURPOSEFUL_CRUISE — straight path toward target | `cruise` | V1 |
| ERRATIC_EVASION — sharp 30-90° jinks | `evade` | V1 |
| ESCAPE_CLIMB — explosive upward pop | `relaunch` | V1 |
| HOVER_INSPECT — nose-up 40°, jagged stationary | `hover` | V1 |
| EDGE_FOLLOW — wide avoidance arc near walls | Soft avoidance system | V1 |
| TERRITORIAL_SPIRAL — ascending corkscrew orbit | `spiral` (stub) | V2 |
| PATROL_SWEEP — back-and-forth corridor | `patrol` (stub) | V2 |
| NECTAR_APPROACH — shallow descent, proboscis out | `approach_land` | V1 |

### Landing and Surface

| Behavior | States it maps to | Priority |
|---|---|---|
| SPIRAL_DESCENT — widening downward spiral | Full approach sequence | V2 |
| DIRECT_SETTLE — nose-high slow drift down | `approach` → `land_impact` | V1 |
| DROP_LAND — quick downward pop + wing bounce | `land_impact` | V1 |
| WING_SETTLE — slow open-to-fold after landing | `perch_settle` | V1 |
| BOUNCE_SHUFFLE — micro-hops on surface | `perching` micro-movement | V2 |

### Perch Idle

| Behavior | States it maps to | Priority |
|---|---|---|
| BASK_OPEN — wings flat, complete stillness | `perch_bask` | V1 |
| SLOW_PUMP — 2-4s open-close cycle | `perch_pump` | V1 |
| WING_SHIVER — high-frequency micro-vibration | `perch_shiver` | V1 |
| BODY_ROCK — subtle whole-body sway | Layered on any perch idle | V1 |
| ANTENNAE_CURL — slow antenna movement | V2 — requires antennae in sprite | V2 |
| GROOM_PROBOSCIS — head bows, proboscis extends | V2 — requires proboscis in sprite | V2 |
| SUDDEN_ALERT — snap-open wings from folded | `perch_alert` | V1 |
| ROOST_HANG — hanging from top edge, limp | `perching` on top surface | V1 |

---

## Sprite Authoring Notes

For the art team / future sprite work:

- **Base resolution:** 64×64 px per frame. Horizontal strip layout (same as current).
- **Direction:** Three orientations needed — **left-facing** (canonical), **right-facing** (free horizontal flip, no need to draw), and **forward-facing** (the current Wisp sprite — reserved for dialogue only). Right-facing is always generated at render time from the left-facing strip via `ctx.scale(-1, 1)`.
- **Forward-facing sprite** is a distinct set of strips separate from the directional flight/perch strips. It is only shown when a bubble is active. Design it with the creature looking directly at the viewer — engaged, attentive.
- **Tilt frames:** Draw 3 frames for left bank and 3 for right bank (10°, 20°, 30° tilt). Do not use CSS `rotate()` on pixel art — runtime rotation destroys pixel edges. These must be pre-drawn.
- **Approach/landing tilt:** 2-3 frames of nose-high attitude (body pitched up 30-40°).
- **Frame 0 rule:** The first frame of every animation strip must be a neutral/compatible pose (wings roughly mid-position, body level). This ensures immediate cuts between states don't produce visual shock.
- **Wing beat:** The "clap-and-fling" snap (wings touching at top of upstroke) is one frame — a "pinched" or "closed" frame at the top of the upstroke arc. This is physically accurate and visually distinctive.
- **Perch orientation:** Draw perching sprites for floor (bottom edge), wall (left/right edge — one direction, free flip gives the other), and ceiling (top edge). These differ enough that horizontal flip alone won't serve ceiling perching.
- **Tools:** Aseprite for authoring. PixelLab or Spritesheets.ai for generating draft animation frames from the hero sprite, then clean up in Aseprite.

---

## Files

| File | Responsibility |
|---|---|
| `src/hooks/useCreaturePhysics.ts` | Physics loop, FSM, simplex noise, collision, drag velocity, work area bounds |
| `src/hooks/useCreatureAnimation.ts` | Maps physics state + velocity to animation state; drives canvas frame selection |
| `src/components/Creature.tsx` | Canvas rendering, spritesheet playback, CSS transforms for squish/stretch |
| `src/components/CreatureContextMenu.tsx` | Right-click context menu component |
| `src/App.tsx` | Composes all of the above; wires Tauri events to physics state |

---

## What Is Not In Scope (Yet)

- **Multiplayer / second creature** — single instance only
- **Screen content awareness** — creature does not react to what is on screen
- **Sound sync to animation** — wing-beat audio is independent of sprite frame timing
- **Tier 2 sensor integration** — clipboard/calendar signals do not yet influence creature behavior
- **TERRITORIAL_SPIRAL / PATROL_SWEEP** — stubbed in FSM, no trigger logic yet (V2)
- **Proboscis / antennae animation** — requires sprite work not yet done (V2)
