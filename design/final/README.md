# Polter Design System

> A silent desktop companion that watches how you work — not what you type — and occasionally tells you something true about yourself.

A small pixel-art ghost floats on your screen, reflecting your mental state through its mood and movement. Polter is quiet, observational, and never performative. The design system reflects that: low-saturation, late-night calm, almost no chrome, the ghost is the only "icon" we ever need.

---

## Sources

The user provided eight 48×48 pixel-art ghost sprites (8-directional facing) as the core brand asset. No codebase, Figma file, or existing brand guide was attached — the visual + tonal direction in this system was derived from:

- The eight sprites in `assets/ghost/` (front, back, left, right, and four diagonals).
- The product description (silent overlay, behavioral observation, second-person lowercase voice, no app shell).
- The voice sample: *"you've been still for a while. that's unusual for a tuesday."*

If a codebase, Figma, or longer voice corpus exists, attach it via the Import menu and we'll tighten this against the real source.

---

## Index — what's in this folder

| Path | What it is |
|---|---|
| `README.md` | This file — content fundamentals, visual foundations, iconography. |
| `SKILL.md` | Cross-compatible skill manifest for Claude Code / agent skills. |
| `colors_and_type.css` | All design tokens (color, type, space, radii, shadow, motion). |
| `assets/ghost/*.png` | Eight 48×48 sprites — the core mascot. |
| `preview/*.html` | Cards rendered into the Design System tab. |
| `ui_kits/desktop/` | Ghost overlay + insight bubble + dashboard (the actual product). |
| `ui_kits/website/` | Marketing landing page. |

---

## CONTENT FUNDAMENTALS

### Voice (the ghost speaking)

The ghost's voice is the most distinctive thing about Polter. Get this wrong and the whole product feels off.

- **Second person, lowercase, present tense.** Always. No exceptions.
- **One sentence. Maybe two.** Never three.
- **Observational, never prescriptive.** The ghost notices. It does not advise, suggest, recommend, encourage, or coach.
- **No exclamation marks. No emoji. No greetings. No sign-offs.** No "hey," no "👋," no "hope this helps."
- **No questions directed at the user.** The ghost is not a chatbot.
- **Quiet specificity over generic insight.** "you opened seven tabs in the last minute" beats "you seem distracted."
- **Time and pattern, not judgment.** Compare against the user's own baseline, never against an ideal.

#### Yes — voice examples

> you've been still for a while. that's unusual for a tuesday.

> three context switches in the last ten minutes.

> your typing slowed around 4pm. it usually does.

> the cursor hasn't moved in eleven minutes. you're either reading or away.

> you've come back to this file four times today.

#### No — what the ghost would never say

> 🌟 Great focus session! Keep it up! → emoji, exclamation, prescriptive
> Hey! It looks like you might be distracted. → greeting, hedging, judgment
> Try taking a break — you've been working for 90 minutes. → advice
> Are you feeling overwhelmed? → question, projection
> You should drink some water. → prescriptive, parental

### Voice (the product speaking — marketing, settings, errors)

When Polter speaks *about* itself (not as the ghost), it stays close to the ghost's voice but allows slightly more structure:

- Lowercase headlines for big moments. Sentence case for UI labels.
- Short sentences. Plain words. No marketing puffery.
- **No "AI." No "intelligence." No "smart."** Polter watches, notices, learns your baseline. That's it.
- Privacy talk is direct: *"never captures what you type. only timing patterns."*
- Buttons are verbs: *download*, *quit*, *export*. Not *Get Started Today*.

### Casing

| Surface | Case |
|---|---|
| Ghost speech | all lowercase |
| Marketing headlines | all lowercase |
| UI labels, buttons | Sentence case |
| Section headers in dashboards | Sentence case |
| Eyebrows / metadata | UPPERCASE with wide tracking, mono font |
| Code, paths, keys | lowercase mono |

### Vibe

A thoughtful friend who's been watching you for six months and finally says one true thing. Late-night, ambient, slightly literary. Not cute, not horror, not corporate, not therapeutic.

---

## VISUAL FOUNDATIONS

### Palette

Two surfaces share the system: **the overlay** (dark, sits on the user's actual desktop) and **the marketing site** (warm paper, daylight). Both are low-saturation.

- **Dark surface** — `--bg-0` `#0e0f12` → `--bg-3` `#242832`. Never pure black. There's always a hint of warmth.
- **Light surface** — `--bg-light` `#f3f1ec`, `--bg-paper` `#ebe7df`. Off-white, slightly warm, like aged paper.
- **Foreground on dark** — `--fg-1` `#e8e6e1` → `--fg-4` `#3e3e3b`. Never pure white.
- **The ghost** — `--ghost` `#f5f4ef`. Off-white. Always slightly translucent in the overlay (`--ghost-soft`).
- **Mood colors** — sage (calm), clay (restless), dusk lavender (tired), deep slate (asleep), candlelight (curious). Low saturation, observational, never alarming.
- **Accent** — `--accent` `#d4b87a` (candlelight). Used sparingly — a single hit per screen.

### Typography

Three families, each with a clear job:

1. **Newsreader** (serif, italic-favored) — the **ghost's voice**. Insight bubbles, marketing headlines, anything the ghost says or anything *about* the ghost. Lowercase, slightly italic, tight tracking.
2. **Inter Tight** (sans) — UI body, settings, dashboard labels, buttons. Sentence case.
3. **Departure Mono** (pixel mono) — eyebrows, metadata, timestamps, code, keyboard shortcuts. Lowercase or UPPERCASE-with-tracking.

The pairing of pixel mono + reading-serif mirrors the product itself: a pixel-art creature that says literary things.

> ⚠ Font substitutions: We don't have access to a custom Polter typeface. Newsreader, Inter Tight, and Departure Mono are loaded from Google Fonts as the closest tonal matches. If a custom face exists, drop the `.woff2` files into `fonts/` and update the `@font-face` declarations at the top of `colors_and_type.css`.

### Spacing & rhythm

A small 4px-base scale (`--sp-1` … `--sp-9`). Layouts breathe — the dashboard uses `--sp-7` (48px) between sections, not `--sp-4`. Insight bubbles have `--sp-5` (24px) padding.

### Backgrounds

- **Desktop overlay surface**: transparent. Polter's ghost sits *on* the user's desktop. There is no Polter window in this mode.
- **Insight bubbles**: solid `--bg-2` with a soft outer shadow + 1px subtle inner highlight. Never a gradient.
- **Dashboard**: solid `--bg-1`, no images, no patterns. The data is the texture.
- **Marketing**: warm paper (`--bg-light`). One full-bleed dark hero with the ghost. No stock photography, no illustrations beyond the sprites themselves.
- **No gradients.** Anywhere.
- **No patterns / textures** beyond an optional 1–2% film grain on the marketing hero.

### Motion

- **Drift, never bounce.** The ghost's idle animation is a slow 4s sine-wave float (`--dur-drift`). UI transitions use `--ease-quiet` (`cubic-bezier(0.4, 0, 0.2, 1)`).
- **Fade in. Fade out.** Insight bubbles fade up + slightly drift in (8px Y). They never slide from an edge.
- **Sprite changes are instant** — no tweening between facings. Ghost mood shifts use a slow color crossfade on a tinted overlay (~600ms).
- **No spring physics. No elastic. No anticipation.**
- All motion durations: `--dur-quick` 140ms (UI feedback), `--dur-soft` 280ms (panel transitions), `--dur-slow` 600ms (mood shifts), `--dur-drift` 4000ms (idle float).

### Hover & press

- **Hover on dark** — surface lightens by one step (`--bg-2` → `--bg-3`). No outline glow.
- **Hover on light** — text underlines or border darkens by one step. Never a fill change.
- **Press** — opacity drops to 0.85, no scale transform.
- **Focus ring** — 1px `--accent` with 2px outline-offset. Subtle, not flashy.
- The ghost itself doesn't react to hover. It is not interactive in the conventional sense.

### Borders

1px, low-contrast (`--border-1` `#262932`). Used for dividers in the dashboard and hairlines on insight bubbles. Never a heavy 2px frame.

### Shadows

- **Bubble shadow** — `0 12px 40px rgba(0,0,0,0.45)` outer, plus a 1px inner highlight on top. Insight bubbles are the only thing that gets a real shadow.
- **Card shadow** (`--shadow-card`) — used on dashboard cards in elevated states only.
- **Ghost glow** — 24px diffuse off-white halo at low opacity. Optional, only when the ghost is in a highlighted mood.
- **No drop-shadow on text. No multi-layer neon glows.**

### Transparency & blur

- The overlay surface is fully transparent — there is no Polter window.
- Insight bubbles use a *very* subtle backdrop-filter: `blur(20px) saturate(1.1)` so they sit gracefully on whatever's underneath.
- The dashboard does **not** use blur — it's a real opaque surface.
- The ghost sprite itself is rendered at 50–80% opacity depending on mood (asleep is faintest, curious is most present).

### Corner radii

- `--radius-sm` 4px — pill-like UI chips, eyebrows.
- `--radius-md` 8px — buttons, inputs, dashboard cards.
- `--radius-lg` 14px — modals, larger panels.
- `--radius-bubble` 18px — insight bubbles. Slightly softer, more conversational than the rest of the UI.

### Cards

A Polter card is a `--bg-2` rectangle with a 1px `--border-1` and `--radius-md`. No shadow at rest. No hover lift. The data inside is what makes it visually interesting.

### Layout rules

- The ghost overlay has **no fixed UI** — no taskbar, no menu, no controls when at rest.
- Insight bubbles position themselves relative to the ghost, with an 8px gap and a small "tail" pointing toward the sprite.
- The dashboard uses a single-column, generous-margin layout. No sidebars, no top nav, no breadcrumbs. You arrived here from a context — you don't need to be told where you are.
- Marketing site is single-column, max-width ~720px for prose, with the ghost free to drift slightly on its own track.

### Imagery vibe

- **Cool-warm tension**: the dark surfaces lean cool-blue, the marketing surfaces lean warm-paper. The ghost is white in both.
- **No photography of people.** No stock images, no Unsplash. The ghost is the only character.
- **Pixel art is sacred.** Never scale ghost sprites with smoothing — always `image-rendering: pixelated` (helper class `.pixel-art`). Ghost sprites are presented at 1×, 2× (96px), 4× (192px), or 8× (384px). Nothing in between.

---

## ICONOGRAPHY

**The ghost is the only icon Polter has.** This is intentional. The product is about subtraction.

For UI elements that absolutely require a glyph (settings cog, close X, dropdown chevron), Polter uses **[Lucide](https://lucide.dev)** at 1.5px stroke, sized to match the text it sits beside, color `--fg-2` or `--fg-3`. Loaded from CDN:

```html
<script src="https://unpkg.com/lucide@latest"></script>
```

> ⚠ Substitution flagged: No icon system was provided in the brief. Lucide was chosen as the closest tonal match — thin, precise, geometric, doesn't compete with the pixel ghost. If a custom icon set exists, drop the SVGs in `assets/icons/` and update references.

### Icon rules

- Lucide at 16px (inline with `--fs-md` text) or 20px (with `--fs-lg`).
- Stroke `--fg-3` at rest, `--fg-1` on hover.
- **No filled icons.** Stroke only.
- **No emoji. Anywhere.** Not in copy, not in placeholders, not in commit messages.
- **No unicode glyphs as icons** (no `→`, `✓`, `★`). If you need an arrow, use Lucide's `arrow-right`.
- The ghost sprite is the brand mark, the loader, the empty state, the favicon, the logo. Don't draw anything else with that level of meaning.

### Brand mark

The brand mark is the front-facing ghost sprite (`assets/ghost/front.png`) at any pixel-doubled size. The wordmark is "polter" set in Newsreader italic, lowercase, with the front sprite tucked at the start. There is no logo lock-up beyond this.
