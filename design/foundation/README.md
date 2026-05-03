# Wisp Design System

> A passive desktop companion — a small glowing spirit creature that lives as a transparent overlay on the user's desktop and silently reflects their cognitive and emotional state.

## What is Wisp?

Wisp is a small desktop companion that lives quietly in the corner of your screen. You install it once and forget about it. It watches *how* you work — not what you type, not what you say, but how you behave — and over time, it tells you things about yourself that you never knew. **It is invisible until it has something to say.**

The product is one thing, expressed in three surfaces:

1. **The wisp itself** — a 16×32 pixel sprite, scaled 3–4×, drifting on a transparent overlay that sits above the desktop. It is a glowing orb body with two expressive wings — closer in spirit to a Kirby-meets-moth than a traditional fairy. It glows. It breathes. **Its wings carry the emotion** (spread wide for focused, drooping for tired, tucked close for resting, raised for alert). The body color shifts subtly with state — cool blue-grey neutral, warm amber energized, dim and desaturated for exhausted.
2. **The insight card** — a small, dark, frosted-glass panel that appears when the wisp has something to say. Reads like a quiet sentence, not a notification.
3. **The dashboard** — a larger frosted-glass surface, summoned on click, showing patterns the wisp has noticed over time.

Wisp is **not** a productivity tool. It does not score you, gamify you, or tell you to do better. It is a presence. It notices. Occasionally it leans in.

---

## Design tension

The brief sets up a deliberate tension that the system has to honor:

| Pull | Counter-pull |
|---|---|
| Pixel art sprite (16×32) | Intimate, mysterious mood — not Tamagotchi-cute |
| Game-like aesthetic in the creature | Adult, contemplative tone in the UI |
| Dark, luminescent, "spirit" feel | Insight text must be **comfortably readable** |
| Lives over your desktop | Must not feel like another app window |

Resolution: pixel art is reserved for the **creature and its in-world UI elements** (state pips, tiny labels). Everything the user actually *reads* uses a clean sans-serif on dark frosted glass. The pixel font is texture; the sans is voice.

---

## Sources

No codebase, Figma, or screenshots were attached to this project. The system is derived entirely from the product brief in the kickoff message. Treat this README as the source of truth; if real design assets show up later, reconcile against them.

---

## Index

Root files:

- `README.md` — this file. Start here.
- `SKILL.md` — Agent Skill manifest. Makes this folder usable as a Claude Code skill.
- `colors_and_type.css` — single source of truth: color tokens, type ramp, spacing, radii, shadows, glow, motion. Import this in any new artifact.

Folders:

- `assets/`
  - `logo.svg`, `icon.svg` — brand lockups
  - `sprites/wisp-{state}.png` — seven 16×32 pixel sprites + a sheet
  - `noise.png` — starfield/grain texture for backgrounds
- `preview/` — every Design System tab specimen card (colors, type, spacing, components, voice). Open `index.html`s individually.
- `ui_kits/wisp-desktop/` — the one product surface
  - `index.html` — interactive click-through (states, insight card, dashboard)
  - `Wisp.jsx`, `InsightCard.jsx`, `Dashboard.jsx`, `Wallpaper.jsx`, `StateChip.jsx`, `data.js`
  - `README.md` — kit-level notes

---

## Content fundamentals

Wisp speaks in **second person, lowercase, present tense, short sentences**. It never barks instructions. It observes.

**Voice rules:**

- **"you", never "the user".** Always direct.
- **No "I" from the wisp.** The wisp does not say "I noticed". It says "you've been". The voice is ambient, not characterful.
- **Lowercase by default** in insight text. Sentence case in dashboard headings and labels.
- **Short.** Most insights are one sentence. Two if needed. Never three.
- **Observational, not prescriptive.** "you focus longer in the mornings" — not "try working in the mornings".
- **Specific over generic.** "you've switched windows 47 times in the last hour" beats "you seem distracted".
- **No exclamation marks. No emoji. Ever.** The wisp is quiet. Punctuation is a period or nothing.
- **No greetings, no sign-offs.** Insights appear mid-thought. They do not say hello.

**Examples — yes:**

> you've been still for a while. that's unusual for a tuesday.

> the longest thing you focused on today was forty-three minutes. it was email.

> three days in a row, you've opened figma between 9 and 10pm.

> you typed faster after the second coffee. you also made more mistakes.

**Examples — no:**

> 🎯 Great job staying focused for 43 minutes!
> Hey there! I noticed you've been working hard. Time for a break? 😊
> ALERT: High distraction detected. Recommended action: close Slack.

**Labels and microcopy** (state names, settings, button text) use sentence case and the same restraint. "settings", "sleep", "sound off" — not "Settings", "Sleep Mode", "Audio: Disabled".

**Tone summary:** a thoughtful friend who has been watching you work for six months and finally says one true thing. Then goes quiet again.

---

## Visual foundations

### Color

The palette is built around the metaphor of a **wisp of light against deep night**. Deep, near-black backgrounds with softly luminescent accents. Color is **state-bearing** — the wisp's hue *is* information, not decoration.

- **Backgrounds** — `--ink-900` (near-black indigo) and `--ink-800` (frosted-glass tint). Never pure black; pure black feels like a power-off, not a presence.
- **Focused / neutral states** — cool teals and blues (`--state-focus`, `--state-calm`). The wisp's resting palette.
- **High-energy states** — warm ambers and golds (`--state-spark`, `--state-burn`). Used sparingly; an amber wisp means *something is happening*.
- **Low / fatigued states** — desaturated greys with a violet undertone (`--state-fade`, `--state-rest`). Quiet.
- **Glow** — every accent color has a paired `--glow-*` value used for box-shadow and radial bloom around the wisp. Glow is non-negotiable; it sells the metaphor.

No bright pure white anywhere. Whites are warmed (`--moon-50`) so the dark UI doesn't feel like a blacked-out productivity app.

### Typography

Two families, used for two different jobs.

- **Display / pixel** — `Departure Mono` (or any 8-bit-style monospace, see `fonts/`). Used **only** for: state names ("focusing", "drifting"), tiny in-world labels on the wisp itself, dashboard data labels, and timestamps. Never for body copy. Always uppercase or lowercase, never mixed case. Letter-spacing is wide.
- **Body** — `Inter`. Used for everything the user reads as a sentence: insight text, dashboard prose, settings copy, tooltips. Body sizes start at **15px** because the panels are over busy desktop wallpaper and need to hold up. Line height is generous (1.55+).

The pixel font is **texture and atmosphere**. The sans is **voice**. Mixing them in the same line is fine and even desirable — `[FOCUSING]` in pixel followed by an Inter sentence creates the feel of a status bar leaning into a thought.

### Surfaces

Two surface types, no more.

- **Frosted glass panel** — the only chrome. `background: rgba(...)` over `backdrop-filter: blur(24px) saturate(140%)`. Always slightly cool-tinted. 1px hairline border in `rgba(255,255,255,0.06)`. Always corner-rounded at `--radius-panel` (14px). Soft outer shadow so it floats above whatever wallpaper is behind it.
- **Pixel sprite layer** — no chrome at all. Just the creature plus its glow. `image-rendering: pixelated` on every img/canvas in this layer.

There are no cards-with-left-border-accents, no gradient hero blocks, no white surfaces. If you find yourself reaching for a third surface type, stop.

### Backgrounds

The product runs **over the user's wallpaper**. The system never assumes a background. Specimens and slides use `--ink-900` with a faint star-like noise texture (`assets/noise.svg`, ~3% opacity) to mimic the feel of the overlay floating in space.

### Spacing

A 4px base. Tokens: `--space-1` (4px) → `--space-12` (96px). Panels use `--space-5` (20px) for internal padding. Body copy gets `--space-3` (12px) above and below. Generous space inside panels — the product's whole point is that it doesn't crowd you.

### Radii

- `--radius-pixel` — 0. Pixel sprites and pixel-font labels have **no rounding**. Sharp.
- `--radius-panel` — 14px. The frosted-glass panels.
- `--radius-pill` — 999px. State chips.

The contrast between sharp pixel artifacts and rounded soft glass is intentional and important.

### Shadows and glow

Two systems, both subtle.

- **Panel float** — `0 24px 64px -12px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset`. Lifts panels off the wallpaper.
- **Wisp glow** — radial bloom matching the wisp's current state color. Multi-layer box-shadow at increasing blur radii. Never sharp.

No "drop shadow under a card" — that's a Material UI tic and doesn't fit.

### Motion

Slow. Always slow. The wisp **breathes** — a 4-second sine in/out scale of ±2%. Insights **fade in** over 600ms with a slight downward drift (8px → 0px). Panels **bloom open** from 96% scale + 0 opacity to 100% + 1 over 320ms with `cubic-bezier(0.16, 1, 0.3, 1)`. Nothing bounces. Nothing snaps. Nothing draws attention by moving fast.

Hover states: `opacity: 0.8` on interactive text, plus a subtle `--glow` increase on icon buttons. No color flips. No size changes.

Press states: `opacity: 0.6`. No shrink — pixel sprites can't shrink without looking broken.

### Transparency and blur

Every panel is at most `rgba(...,0.72)` background — you should always faintly see what's behind it. `backdrop-filter: blur(24px)` is the workhorse. The wisp itself sits at 0.92 opacity when active, 0.4 when "drifting" (idle long enough that it's faded into the wallpaper).

### Layout

Wisp is **not full-screen**. The overlay layer is the entire screen but transparent; only the wisp and its panels actually paint. Panels anchor to the wisp's position — they spawn next to it, not at fixed screen coordinates. The dashboard is the one exception: when summoned it pins to a corner the user chose in settings.

There is no app shell. There is no sidebar. There is no header. There is the wisp, and there are things the wisp summons.

---

## Iconography

Icons in Wisp are **rare** and **functional only**. There's no decorative iconography — no little sparkles next to insights, no checkmarks, no info circles.

Where icons appear:

- **Dashboard chrome** — settings gear, sleep (moon), close (×). Five icons total in the entire product.
- **Wisp state pips** — tiny 8×8 pixel-art indicators for states like sleep, mute, recording. Hand-authored as part of the sprite sheet, not from an icon library.
- **No emoji.** Ever.
- **No unicode pictographs** as functional icons. (Unicode arithmetic symbols like `·` for separators are fine.)

For the dashboard's five icons, the system uses **Lucide** (CDN-loaded) because it's a clean stroke set that holds up at small sizes and matches the calm tone. **Substitution flagged:** if the brand later authors its own icon set, swap them in. Stroke width: 1.5px. Color: `--moon-300`. Size: 16px.

The pixel state pips in `assets/sprites/` are part of the brand and should never be replaced with a generic icon library.

---

## Font substitutions (flagged)

No font files were provided. The system specifies:

- **Display / pixel** — `Departure Mono` (free, by Helena Zhang). Loaded from CDN. If you have a custom pixel font, drop the file in `fonts/` and update `colors_and_type.css`.
- **Body** — `Inter` (Google Fonts). The brief said "something like Inter or DM Sans" so this is on-brand by name. Still: if you have a chosen body face, swap it.

**Ask:** please confirm or replace these two choices. Everything downstream depends on them.
