# Wisp — Creature Design and Behavior Reference

This document covers the full design of the creature's sprites, animation, physics, and interaction systems. Read this before touching anything in `useCreaturePhysics`, `useCreatureAnimation`, `Creature.tsx`, or any file that affects how the creature moves or looks.

---

## Overview

The creature is a **ghost** — a small pixel art character that floats around the screen, reacts to the user, and visually reflects the user's mental state through which sprite it wears. It is built entirely from static PNG images. There is no procedural rendering. The code picks the right sprite for the current situation and displays it.

All sprites live in `design/v2/ghost/`.

The creature's behavior layers from bottom to top:

1. **Physics loop** — position, velocity, collision, simplex-noise wander (runs at 60fps)
2. **Physics state machine** — what the creature is *doing* (wander, grabbed, thrown, etc.)
3. **Sprite selector** — reads physics state + mood state and picks the correct PNG
4. **Mood modifier** — the creature's Wisp mental state tunes physics parameters and determines which mood sprite is shown when idle

---

## Sprite Catalog

All 34 sprites, categorized by purpose.

### Direction sprites — idle movement

These are the default sprites shown whenever the creature is just floating around. They are pre-drawn for each direction. No flipping is needed — each direction has its own image.

| File | When used |
|---|---|
| `front.png` | Default idle. Facing directly at the user. Used when the creature is nearly still or there is no dominant direction. |
| `front-right.png` | Moving diagonally toward the user and to the right. |
| `front-left.png` | Moving diagonally toward the user and to the left. |
| `right.png` | Moving right. |
| `left.png` | Moving left. |
| `back.png` | Moving directly away from the user (upward). |
| `back-right.png` | Moving diagonally away and to the right. |
| `back-left.png` | Moving diagonally away and to the left. |

Direction is determined by the creature's velocity vector each frame. The 8 directions divide the full 360° into 45° segments centered on each direction.

---

### Mood state sprites — one per behavioral state

These replace the direction sprite when the creature is in a sustained mood state. They are shown during idle/wander when the system has classified the user's current mental state.

| File | Mood state | When |
|---|---|---|
| `focused.png` | Focus | Steady, rhythmic typing. Deep in work. |
| `calm.png` | Calm | Relaxed, low-intensity activity. Nothing urgent. |
| `quiet.png` | Deep | Flow state. Very little input, completely absorbed. |
| `excited.png` | Spark | Burst of energy. Ideas flying, fast activity. |
| `overworked.png` | Burn | Too much for too long. Stressed, running hot. |
| `tired.png` | Fade | Energy dropping. Running out of steam. |
| `sleepy.png` | Fade → Rest | Transitional. Getting sleepy, not quite asleep yet. Shown as the creature approaches rest. |
| `sleeping.png` | Rest | Long idle. The creature has fallen asleep. |

---

### Action sprites — triggered by specific events

These override everything else while the event is happening.

| File | Trigger | Notes |
|---|---|---|
| `thinking.png` | About to produce a dialogue bubble. | Shown while the AI is generating a response, before the bubble appears. |
| `replying.png` | Dialogue bubble is visible. | Shown for the full duration the bubble is on screen. |
| `listening.png` | Waiting, attentive. No active dialogue but the creature is paying attention. | |
| `celebrate.png` | Achievement or milestone detected. | Briefly shown, then returns to normal. |
| `jumpscared.png` | Startled. Sudden activity after a long quiet period. | |
| `dizzy.png` | Confused state. | |
| `grab.png` | The user is holding the creature right now. | Shown on `pointerdown`, held until `pointerup`. |

---

### Fun / random sprites — happen on their own

These appear randomly during long idle periods to make the creature feel alive and unpredictable. They are not triggered by user behavior — they just happen.

| File | What it is |
|---|---|
| `reading.png` | The creature has pulled out a tiny book and is reading it. |
| `kid.png` | Playful, childlike behavior. |
| `umbrella.png` | The creature is holding a small umbrella. |
| `box.png` | The creature is hiding inside a box. Only the top of its head sticks out. |

---

### Physics sprites — thrown and falling animations

These are used during throw and fall sequences. **All physics sprites are drawn for the right side.** When the creature is moving left, flip them horizontally (CSS `transform: scaleX(-1)`).

#### Throw sequence

The throw animation plays when the user releases the creature with velocity. The sequence runs forward and then the creature returns to its normal state.

| File | Frame | What it shows |
|---|---|---|
| `thrown.png` | Frame 1 | Initial launch. The creature is just released. |
| `thrown-2.png` | Frame 2 | Mid-air, gaining momentum. |
| `thrown-3.png` | Frame 3 | Peak throw, full speed. |
| `thrown-4.png` | Frame 4 | Beginning to slow, arc completing. After this, return to normal. |

**Sequence:** `thrown` → `thrown-2` → `thrown-3` → `thrown-4` → back to direction sprite.

**If the creature hits a wall mid-throw:** cut to `falling-1` immediately. Do not finish the throw sequence.

**After hitting a wall (recovery path):** if the creature does not hit another wall, resume from `thrown-2` → `thrown-3` → `thrown-4` → back to normal.

#### Fall sequence

Used when the creature is falling after hitting a wall, or when it loses control and drops.

| File | Frame | What it shows |
|---|---|---|
| `falling-1.png` | Entry | Hit a wall. The creature is disoriented. Transitions from throw on wall impact. |
| `falling-2.png` | Recovery | The creature catches itself. This is the most common fall frame — it saves itself and doesn't fully drop. |
| `falling-3.png` | Straight down | Used only when the creature is falling nearly vertically downward. Not the default. |

**Flip rule:** same as throw sprites — flip horizontally when the creature is moving or falling to the left.

---

## Flip Rule — Right Side Default

All sprites except the 8 direction sprites are drawn assuming the creature is oriented toward the right side of the screen. Apply `transform: scaleX(-1)` whenever the relevant action is happening toward the left.

**Applies to:** `thrown`, `thrown-2`, `thrown-3`, `thrown-4`, `falling-1`, `falling-2`, `falling-3`, `grab`, `jumpscared`, `celebrate`, `dizzy`, `kid`, `umbrella`, `reading`, `box`, and all other non-direction sprites.

**Does not apply to:** `front`, `front-right`, `front-left`, `left`, `right`, `back`, `back-left`, `back-right` (pre-drawn for their exact directions), and `thinking`, `replying`, `listening`, `calm`, `focused`, `quiet`, `excited`, `overworked`, `tired`, `sleepy`, `sleeping` (face forward, no flip needed).

Flip direction is determined by `velocity.x` sign at the moment the sprite is first shown. If velocity is zero, use the last known horizontal velocity.

---

## Critical Implementation Rule: No React State for Position

**Position and velocity must never live in React `useState`.** Physics runs at 60fps — putting position in state causes 60 React re-renders per second. This is too much.

**The rule:** Position and velocity live in `useRef`. The physics loop mutates the creature's DOM element directly via `element.style.transform`. React never touches position at 60fps.

Persistence: the physics loop debounce-syncs position to the Tauri store every ~2 seconds, saved as percentage of work area.

---

## Dependencies

| Package | Version | Use |
|---|---|---|
| `simplex-noise` | 4.0.3 | Organic flight path generation |

Do not add matter-js, rapier, planck, cannon-es, or any full physics engine. The math for a single entity with four wall boundaries does not need a simulation library.

---

## Physics State Machine

The creature is always in exactly one physics state. Transitions are the physics loop's responsibility — the sprite selector reads the current state passively.

```typescript
type PhysicsState =
  | 'wander'       // Default. Simplex-noise steering, lazy arcs, burst-coast rhythm
  | 'glide'        // Coast phase within wander — slight altitude loss
  | 'burst'        // Sudden acceleration
  | 'fly_idle'     // Stationary hover in place, position nearly unchanged
  | 'hover'        // Nearly stationary — physics-driven low speed
  | 'cruise'       // Purposeful flight toward a soft target point
  | 'evade'        // Erratic evasion — sharp jinks, triggered by fast cursor
  | 'approach'     // Descending arc toward a surface
  | 'settled'      // Near a surface, hovering close, dimmed slightly
  | 'relaunch'     // Leaving the settled position
  | 'grabbed'      // User is holding the creature
  | 'thrown'       // Released with velocity — carries momentum
  | 'falling'      // Hit a wall or lost control — dropping
  | 'recovering'   // Regaining control after a fall
  | 'click_react'  // Startled by a click
  | 'dialogue'     // Bubble is visible — creature holds still, shows replying sprite
```

### State Transition Rules

| From | To | Trigger |
|---|---|---|
| `wander` | `fly_idle` | Random pause mid-flight (every 8–25s), or before direction reversal |
| `wander` | `glide` | Every 2–4 flap cycles; holds ~0.3s |
| `wander` | `burst` | Random impulse or re-entry from fall/relaunch |
| `wander` | `hover` | Speed drops below 20 px/s for > 0.5s |
| `wander` | `cruise` | Soft target assigned |
| `wander` | `evade` | Cursor velocity exceeds fast threshold |
| `wander` | `approach` | Landing timer fires (random 45–120s of flight) |
| `wander` / `glide` / `cruise` | `grabbed` | `onPointerDown` fires |
| `grabbed` | `thrown` | `onPointerUp` fires; velocity from last 40ms of pointer history |
| `thrown` | `falling` | Collision at speed ≥ 250 px/s |
| `thrown` | `wander` | Speed decays below 60 px/s without hitting a wall |
| `falling` | `recovering` | Fall animation completes (~0.8s) |
| `recovering` | `wander` | Upward velocity established and sustained > 0.5s |
| `approach` | `settled` | Creature reaches surface within 8px |
| `settled` | `relaunch` | Settle timer fires (random 4–20s), or click on creature |
| `relaunch` | `burst` | Re-launch completes |
| Any state | `dialogue` | `insight_ready` event fires — creature slows, shows `thinking` then `replying` |
| `dialogue` | previous | Bubble dismissed — creature resumes direction sprites and `wander` |
| `wander` / `hover` | `click_react` | Click on creature |
| `click_react` | `wander` | Reaction completes (~0.5s) |

---

## Sprite Selection Logic

The sprite selector runs every time the physics state or mood state changes. It returns the path to the PNG to display.

```
Priority (highest first):
1. grabbed         → grab.png (+ flip if moving left)
2. thrown / falling → throw/fall sequence sprites (+ flip if moving left)
3. dialogue        → thinking.png (pre-bubble) → replying.png (bubble visible)
4. click_react     → jumpscared.png
5. recovering      → falling-2.png (creature saving itself)
6. random fun      → reading / kid / umbrella / box (if random timer fired)
7. mood state      → focused / calm / quiet / excited / overworked / tired / sleepy / sleeping
8. direction       → front / front-right / right / back-right / back / back-left / left / front-left
```

When in `wander`, `glide`, `hover`, or `cruise` with no overriding condition: show the mood sprite if a Wisp state is active, or the direction sprite if no mood is dominant.

Direction sprite selection from velocity vector:

```
angle = atan2(vy, vx)   // in degrees, 0° = right

right:        -22.5° to  22.5°
front-right:   22.5° to  67.5°
front:         67.5° to 112.5°   (moving toward user)
front-left:   112.5° to 157.5°
left:         157.5° to 202.5°   (same as -157.5° to -202.5°)
back-left:    202.5° to 247.5°
back:         247.5° to 292.5°   (moving away from user / upward)
back-right:   292.5° to 337.5°
```

---

## Throw and Fall Sequences in Detail

### Throw

```
User releases creature →
  velocity ≥ 60 px/s?
    YES → enter thrown state
      show thrown.png → wait N ms → thrown-2.png → thrown-3.png → thrown-4.png
        during any frame: hits wall at ≥ 250 px/s?
          YES → cut to falling-1.png immediately
                then: no more walls? → resume thrown-2.png → 3 → 4 → normal
          NO  → complete thrown-4.png → back to direction sprite
    NO  → skip thrown state, go straight to wander
```

Frame timing: each thrown frame displays for approximately 80–100ms. Adjust based on throw velocity — faster throw = shorter frame time.

### Fall

```
Wall hit at speed →
  show falling-1.png (disoriented, ~300ms)
    velocity is mostly vertical (nearly straight down)?
      YES → falling-3.png (straight-down fall)
      NO  → falling-2.png (catching itself, most common)
    creature stabilizes →
      if no wall nearby: recover → wander
      if thrown recovery path: resume thrown-2 → 3 → 4 → wander
```

---

## Interaction Events

### Grab and Throw

On `onPointerDown`:
- Switch to `grabbed` state
- Show `grab.png`
- Maintain a 100ms rolling pointer history for velocity calculation

On `onPointerMove` while grabbed:
- Follow pointer position
- Keep pointer history updated

On `onPointerUp`:
- Derive throw velocity from last 40ms of pointer history
- Clamp velocity to ±1400 px/s per axis
- Enter `thrown` state with 500ms lock
- Begin throw animation sequence
- Flip sprites based on horizontal velocity direction

### Single Click

- If state is `thrown`, `falling`, or `recovering`: **ignored** (browser fires synthetic click after pointerup — guard against this)
- If state is `settled`: triggers relaunch
- Otherwise: `click_react` — show `jumpscared.png`, velocity impulse away from click origin

### Dialogue

- `thinking_ready` event fires → show `thinking.png`, creature slows to `fly_idle`
- `insight_ready` event fires → bubble appears, show `replying.png`
- Bubble dismissed → creature resumes direction sprites, returns to `wander`

### Random Fun Behaviors

A timer runs while the creature is in `wander` or `settled` with no user interaction. When it fires (random 3–8 minute interval):

1. Creature drifts to a comfortable position
2. Shows a random fun sprite: `reading`, `kid`, `umbrella`, or `box`
3. Holds for 10–30 seconds
4. Returns to normal

---

## Mood Modifier System

The creature's Wisp mental state tunes physics parameters. It does not change the FSM — it changes how the FSM behaves. The mood sprite replaces the direction sprite during idle wander.

| Wisp State | Sprite | Flight feel |
|---|---|---|
| `focus` | `focused.png` | `MAX_SPEED * 1.0` (baseline), regular rhythm |
| `calm` | `calm.png` | `MAX_SPEED * 0.7`, longer coasts, more settle time |
| `deep` | `quiet.png` | `MAX_SPEED * 0.85`, straighter paths, less erratic |
| `spark` | `excited.png` | `MAX_SPEED * 1.4`, shorter coasts, more burst surges |
| `burn` | `overworked.png` | `MAX_SPEED * 1.2`, more evade triggers, erratic jinks |
| `fade` | `tired.png` → `sleepy.png` | `MAX_SPEED * 0.5`, frequent settling, long settle time |
| `rest` | `sleeping.png` | `MAX_SPEED * 0.3`, nearly stationary, almost always settled |

`sleepy.png` replaces `tired.png` as the creature gets closer to triggering the `rest` state. The threshold is based on how long the session has been idle.

Parameters lerp toward new targets over 3 seconds on state change — no snapping.

---

## Work Area and Position

Always use **work area** dimensions, never full screen dimensions. The Windows taskbar is excluded. Source: `currentMonitor().workArea` from Tauri.

DPI note: all position math uses CSS logical pixels. Save position as percentage of work area — never raw pixels.

---

## Collision and Edge Handling

### Soft Avoidance

Before reaching a wall, the noise field is biased away from it. When within 80px of any edge, a repulsive force bends the flight path in a wide arc — the creature curves away without bouncing.

### Hard Collision

If the creature reaches the wall despite avoidance (thrown, or avoidance failed):

```typescript
if (pos.x + SPRITE_W > WORK_AREA_W) {
  pos.x = WORK_AREA_W - SPRITE_W
  vel.x *= -0.55  // soft bounce
}
```

Velocity at collision determines outcome:
- ≥ 250 px/s → `falling` state. Cut to `falling-1.png`.
- < 250 px/s → elastic bounce. Continue in `thrown` or `wander`.

---

## Flight Algorithm

### Simplex Noise Wander

```typescript
const noiseX = simplex.noise2D(noiseT * FREQ, 0)
const noiseY = simplex.noise2D(0, noiseT * FREQ)
noiseT += dt

const desiredVel = normalize({ x: noiseX, y: noiseY })
steer = clamp(desiredVel * MAX_SPEED - velocity, MAX_FORCE)
velocity = clamp(velocity + steer * dt, MAX_SPEED)
position = position + velocity * dt
```

| Constant | Default | Effect |
|---|---|---|
| `FREQ` | `0.0005` per ms | Lower = long lazy arcs. Higher = erratic darting. |
| `MAX_SPEED` | `80 px/s` | Peak cruise speed. |
| `MAX_FORCE` | `120 px/s²` | Steering responsiveness. |

### Soft Attractor System

Three weak forces layer on top of the noise wander:

- **Screen-center gravity (5% weight):** pulls creature slowly back toward center. Prevents it from staying in one corner.
- **Slow cursor attraction (15% weight):** when cursor moves slowly, creature drifts toward it.
- **Fast cursor repulsion (15% weight):** when cursor moves fast, triggers `evade` — jinks away.

---

## Files

| File | Responsibility |
|---|---|
| `design/v2/ghost/` | All sprite PNGs — source of truth for visuals |
| `src/hooks/useCreaturePhysics.ts` | Physics loop, state machine, simplex noise, collision, drag velocity, work area bounds |
| `src/hooks/useCreatureAnimation.ts` | Reads physics + mood state, returns the correct sprite path and flip flag |
| `src/components/Creature.tsx` | Renders the sprite PNG, applies CSS flip transform, handles pointer events |
| `src/components/CreatureContextMenu.tsx` | Right-click context menu |
| `src/App.tsx` | Composes everything, wires Tauri events to physics state |

---

## What Is Not In Scope Yet

- **Multiplayer / second creature** — single instance only
- **Screen content awareness** — creature does not react to what is on screen
- **Sound sync to animation** — sound is independent of sprite timing
- **Tier 2 sensor integration** — clipboard/calendar signals do not yet influence behavior
- **Spiral / patrol flight patterns** — stubbed in FSM, no trigger logic yet (V2)
