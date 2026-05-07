# Polter Website — Design Spec

> The marketing landing page and interactive demo for Polter, the silent desktop companion.

This document is the single source of truth for everything about the Polter website. Read it fully before building anything. It covers the brand, design system, section-by-section layout, image assets, the creature web demo, and the monorepo restructure needed to share code between desktop and web.

---

## What This Website Is

A single-page marketing site that introduces Polter — what it does, how it works, why it's trustworthy, and where to get it. The site also hosts a live interactive demo of the creature (the ghost floats on the page, visitors can drag and throw it, it cycles through moods and shows sample insight bubbles).

The website redirects visitors to GitHub for download. There is no installer hosted on the site itself.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS + Polter design tokens (CSS variables from `design/final/colors_and_type.css`) |
| Fonts | Newsreader, Inter Tight, Departure Mono (Google Fonts) |
| Icons | Lucide (1.5px stroke, `--fg-2` / `--fg-3` color, used only for unavoidable UI glyphs) |
| Creature demo | Shared `creature-ui` package (see Monorepo section) |
| Deployment | TBD |
| GitHub link | Placeholder: `github.com/polter-app/polter` |

---

## Design System Reference

The design system lives in `design/final/`. Read these files before writing any code:

| File | What it contains |
|---|---|
| `design/final/README.md` | Voice rules, visual foundations, iconography, layout rules, full design philosophy |
| `design/final/SKILL.md` | Quick-reference skill manifest for generating on-brand artifacts |
| `design/final/colors_and_type.css` | All design tokens — colors, typography, spacing, radii, shadows, motion |
| `design/final/assets/ghost/` | Eight 48x48 pixel-art ghost sprites (8 directions) |
| `design/final/ui_kits/website/` | Existing prototype components (Hero, VoiceSamples, PrivacyNote, Footer) |
| `design/final/ui_kits/desktop/` | Desktop product prototype (Ghost, InsightBubble, Dashboard) |
| `design/final/preview/` | 18 specimen cards showing every token and component in isolation |

### Design Tokens Summary

**Surfaces:**
- Dark: `--bg-0` `#0e0f12` → `--bg-3` `#242832`. Never pure black.
- Light: `--bg-light` `#f3f1ec`, `--bg-paper` `#ebe7df`. Warm off-white, like aged paper.

**Foreground:**
- On dark: `--fg-1` `#e8e6e1` (primary) → `--fg-4` `#3e3e3b` (disabled). Never pure white.
- On light: `--fg-ink` `#1a1a18` (primary) → `--fg-ink-3` `#8a8980` (muted).

**Ghost:** `--ghost` `#f5f4ef`. Always slightly translucent in overlays (`--ghost-soft`).

**Mood colors (low saturation, observational, never alarming):**
- Calm: `--mood-calm` `#7a9e8b` (sage)
- Restless: `--mood-restless` `#c08a64` (clay)
- Tired: `--mood-tired` `#8e7fa8` (dusk lavender)
- Asleep: `--mood-asleep` `#4f5a6e` (deep slate)
- Curious: `--mood-curious` `#d4b87a` (candlelight)

**Accent:** `--accent` `#d4b87a` (candlelight). Used sparingly — one hit per screen.

**Typography:**
- Ghost voice / display: `Newsreader` (serif, italic-favored, lowercase)
- UI body: `Inter Tight` (sans, sentence case)
- Metadata / eyebrows: `Departure Mono` (pixel mono, uppercase with wide tracking or lowercase)

**Spacing:** 4px base. `--sp-1` (4px) → `--sp-9` (96px).

**Radii:** `--radius-sm` 4px, `--radius-md` 8px, `--radius-lg` 14px, `--radius-bubble` 18px.

**Shadows:** Bubble shadow (inner highlight + outer), card shadow, ghost glow. No drop-shadow on text. No multi-layer neon.

**Motion:**
- `--ease-quiet`: `cubic-bezier(0.4, 0, 0.2, 1)` — UI transitions
- `--ease-drift`: `cubic-bezier(0.45, 0.05, 0.55, 0.95)` — ghost float
- `--dur-quick`: 140ms (UI feedback)
- `--dur-soft`: 280ms (panel transitions)
- `--dur-slow`: 600ms (mood shifts)
- `--dur-drift`: 4000ms (idle float)
- Rule: drift, never bounce. Fade in/out. No spring physics. No elastic. No anticipation.

**Borders:** 1px, low-contrast (`--border-1` `#262932` on dark, `--border-light` `#d8d4cb` on light).

**No gradients. No emoji. No stock photography. The ghost is the only character.**

---

## Design Skills & Principles

When building this website, apply these two skill sets together. The Polter design system is the authority on brand (colors, voice, tokens). The skills below govern layout, motion, and anti-slop execution.

### Frontend Design Skill

- Bold aesthetic direction, executed with precision
- Typography: distinctive font choices (we have Newsreader + Departure Mono — these ARE distinctive, keep them)
- Motion: staggered scroll reveals, animation-delay cascades, high-impact load sequence
- Spatial composition: asymmetric layouts, overlap, generous negative space
- Backgrounds: atmosphere and depth via textures, not solid colors

### Design Taste Skill — Active Configuration

| Parameter | Value | Meaning |
|---|---|---|
| DESIGN_VARIANCE | 8 | Asymmetric layouts, offset columns, big empty zones. No centered heroes. |
| MOTION_INTENSITY | 6 | Fluid CSS transitions, scroll-triggered fades, staggered reveals. No spring physics (conflicts with Polter's "drift, never bounce"). |
| VISUAL_DENSITY | 4 | Art gallery mode. Generous spacing. Data breathes. |

### Key Rules From Both Skills

1. **No centered hero.** Split or left-aligned. DESIGN_VARIANCE 8 demands asymmetry.
2. **No 3-column equal card rows.** Use asymmetric grids, vertical stacks, or diagonal layouts.
3. **No Inter font.** We use Inter Tight (different typeface, part of our locked design system).
4. **No emoji anywhere.** Not in copy, not in code, not in placeholders.
5. **No AI purple/blue aesthetic.** Our palette is warm-cool tension: candlelight accent, mood colors, warm paper vs cool dark.
6. **No pure black (`#000000`).** Use `--bg-0` (`#0e0f12`).
7. **No pure white.** Use `--fg-1` (`#e8e6e1`) or `--ghost` (`#f5f4ef`).
8. **No bounce, no spring physics.** Polter motion is drift. `--ease-quiet` and `--ease-drift` only.
9. **No gradients.** Radial vignettes for atmosphere are fine (applied as positioned radials at 4-8% opacity), but no gradient fills, no gradient text, no gradient buttons.
10. **Stagger everything.** Lists, cards, sections — nothing appears all at once. Use `animation-delay` cascades on scroll-enter.
11. **Ghost sprites always render with `image-rendering: pixelated`.** Scale at integer multiples only (1x=48px, 2x=96px, 3x=144px, 4x=192px, 8x=384px).
12. **Full-height sections use `min-h-[100dvh]`, not `h-screen`.** Prevents mobile layout jump on iOS Safari.
13. **Mobile: all asymmetric layouts collapse to single column.** No horizontal scroll, ever.
14. **Animate only `transform` and `opacity`.** Never animate `top`, `left`, `width`, `height`.

---

## Page Structure — Surface Rhythm

The page alternates between dark and light surfaces. Dark sections carry weight (first impression, authority, creature showcase, final CTA). Light sections breathe on warm paper.

```
Section              Surface         Background
─────────────────────────────────────────────────
1. Hero              DARK            --bg-0
2. What It Is        LIGHT           --bg-light
3. How It Works      LIGHT           --bg-light
4. The Science       DARK            --bg-0
5. Voice Samples     LIGHT           --bg-light
6. The Creature      DARK            --bg-1
7. Lightweight       LIGHT           --bg-light
8. Privacy & Data    LIGHT           --bg-paper
9. Download CTA      DARK            --bg-0
10. Footer           DARK            --bg-0
```

---

## Section Designs

### 1. Hero — DARK

**Purpose:** First impression. Visitor decides to stay or leave.

**Layout:** Asymmetric split — text left (~60%), ghost right (~40%). Text left-aligned with generous top margin. Not centered.

**Content:**
- Eyebrow: `DEPARTURE MONO` uppercase, wide tracking, `--fg-3` — "a quiet desktop companion"
- Headline: `Newsreader` italic, ~72-84px, lowercase, `--ghost` color — "something is watching you work."
- Subtext: `Inter Tight`, 18px, `--fg-2` — "polter is a small pixel ghost that floats on your desktop. it watches how you work — never what you type — and occasionally tells you something true about yourself."
- Primary CTA: Candlelight (`--accent`) filled button, `--radius-md` — "View on GitHub"
- Secondary link: `DEPARTURE MONO` 11px uppercase — "read more below →"
- Platform tag: `DEPARTURE MONO` 11px, `--fg-3` — "windows · open source · everything stays on your machine"

**Right column:** Desk scene image (Asset #3) with ghost sprite composited on the monitor via code. The ghost drifts with 4s sine-wave animation. On mouse move, ghost faces cursor using 8-direction sprites.

**Background:** Dark fabric texture (Asset #2) at 3-5% opacity over `--bg-0`. Warm candlelight radial vignette in upper-right corner at ~6% opacity (CSS, not image).

**Motion:**
- Staggered load: eyebrow (0ms) → headline (200ms) → subtext (400ms) → CTA (600ms) → desk scene + ghost (300ms, from right with opacity)
- All transitions use `--ease-quiet`, duration `--dur-slow` (600ms)

**Mobile:** Single column. Text above, ghost + desk scene below (scaled down).

---

### 2. What It Is — LIGHT

**Purpose:** Bridge intrigue to understanding. One paragraph that explains the product.

**Layout:** Single column, max-width ~720px, left-aligned with generous left margin (~15vw on desktop). Art gallery spacing.

**Content:**
- Eyebrow: `DEPARTURE MONO` uppercase, `--fg-ink-3` — "what is polter"
- Statement: `Newsreader` italic, ~42px, lowercase, `--fg-ink` — "you install it once and forget about it. it watches how you behave — speed, rhythm, pauses, patterns — and over time, it tells you things about yourself that you never knew."

**No images. No cards. No embellishment.** The statement does the work. Restraint is the design. The copy here must NOT repeat the hero subtext — it expands on the concept, shifting from "what it is" to "what the experience feels like."

**Background:** Warm paper texture (Asset #1) at 40-60% opacity over `--bg-light`.

**Motion:** Fade in + 8px upward drift on scroll-enter, `--dur-slow`, `--ease-quiet`.

**Mobile:** Same, but left margin collapses to standard `px-6`.

---

### 3. How It Works — LIGHT

**Purpose:** Explain the mechanism in three simple steps.

**Layout:** Vertical stagger — three blocks, each offset progressively to the right. Block 1 starts left-aligned, Block 2 indents ~8vw, Block 3 indents ~16vw. Creates diagonal reading flow. NOT three equal columns.

**Each block:**
- Step number: `DEPARTURE MONO`, 48px, `--fg-ink-3` at 40% opacity — "01", "02", "03"
- Title: `Inter Tight` semibold, 20px, `--fg-ink` — the action
- Description: `Inter Tight` regular, 16px, `--fg-ink-2`, max-width 45ch — one sentence

**Content:**
1. "install it" — "download polter. a small ghost appears on your desktop. that's it."
2. "forget about it" — "polter watches your patterns silently. keystroke timing, mouse rhythm, app switching. never content."
3. "it notices" — "when polter sees something worth saying, it tells you. one sentence. maybe two."

**Detail:** A small ghost sprite (48px, existing asset) sits at the end of step 3 at `opacity: 0.5`.

**Background:** Warm paper texture continues from section 2.

**Motion:** Blocks stagger on scroll — each 150ms after previous. Fade up + slight translateY.

**Mobile:** Single column, no indentation. Steps stack vertically with standard spacing.

---

### 4. The Science — DARK

**Purpose:** Build credibility. "This isn't guesswork."

**Layout:** Asymmetric two-column. Left (55%): research findings as editorial pull-quotes. Right (45%): vertical stack of paper citations in mono. Right column starts ~80px lower than left (offset, not grid-aligned).

**Content — Left column (findings):**
Each finding: `Newsreader` italic, ~24px, `--fg-1`, thin `--border-1` line above. Spacing: `--sp-7` (48px) between findings.

- "keystroke timing reliably shifts under fatigue — slower rhythm, longer holds, more corrections."
- "mouse jitter increases measurably under stress before the person consciously feels it."
- "context-switching more than once every three minutes degrades focus recovery by 25%."
- "compulsive saving — ctrl+s every few seconds — is a documented behavioral marker for anxiety."

**Content — Right column (citations):**
`DEPARTURE MONO`, 11px, `--fg-3`, uppercase, wide tracking. Each citation: author, year, journal. Faint `--border-1` separators. Texture, not reading material.

Source: `RESEARCH.md` and `src-tauri/src/inference/research.rs`. Use real paper references from those files:
- Giancardo et al. (2016), Scientific Reports
- Zulueta et al. (2018), JMIR
- de Jong et al. (2020), PLOS ONE
- Mark et al. (2008), CHI
- Epp et al. (2011), CHI
- Freeman and Ambady (2010), Behavior Research Methods

**Section header:**
- Eyebrow: `DEPARTURE MONO` — "the science"
- Headline: `Newsreader` italic, ~48px — "this isn't guesswork."

**Image:** Research journal (Asset #5) floating in the margin between columns at low opacity.

**Background:** Dark fabric texture (Asset #2) at 3-5% opacity.

**Motion:** Citations stagger from right (100ms apart). Findings fade from left. Creates converging visual.

**Mobile:** Single column. Findings first, citations below as a compact list.

---

### 5. Voice Samples — LIGHT

**Purpose:** The emotional peak. Visitors feel the product's personality.

**Layout:** Asymmetric two-column grid — one large sample left (~60% width, full height), two smaller stacked right. NOT three equal cards.

**Each sample card:**
- Surface: `--bg-paper`, `--radius-bubble` (18px), `1px --border-light`
- Voice: `Newsreader` italic, lowercase, 22px (large card) / 18px (small cards)
- Footer: `--border-light` divider, then mood dot (5px circle, mood color) + timestamp + mood name in `DEPARTURE MONO` 10px uppercase

**Content:**
- Large: "three context switches in the last ten minutes. your usual is one." — restless / clay / 04:21pm
- Small top: "your typing has settled. forty-one keystrokes a minute, steady." — calm / sage / 02:08pm
- Small bottom: "you've come back to this file four times today." — tired / dusk lavender / 11:42am

**Section header:**
- Eyebrow: `DEPARTURE MONO` — "what it might say"
- Headline: `Newsreader` italic, ~56px — "one sentence." + `--fg-ink-3` "maybe two."

**Background:** Warm paper texture.

**Motion:** Cards stagger on scroll — large (0ms), top-right (150ms), bottom-right (300ms). Scale from 0.97 → 1.0 + fade.

**Mobile:** Single column. Large card first, two small cards below.

---

### 6. The Creature — DARK

**Purpose:** Showcase the ghost. Show that it's alive, has moods, has personality.

**Layout:** Left column: text. Right column: product screenshot mockup (Asset #4) showing the ghost on a desktop with an insight bubble. Ghost sprites from existing assets arranged as a loose cluster above or around the mockup — not a grid, more like a constellation. Sprites at varying sizes (96px, 64px) and opacities.

**Sprites shown (existing assets from `design/final/assets/ghost/` and `design/v2/ghost/`):**
- Mood states: `focused`, `calm`, `excited`, `overworked`, `sleepy`, `sleeping`
- Actions: `grab`, `reading`, `box`
- Each labeled: `DEPARTURE MONO` 10px — "focused", "calm", "reading a book"

**Left column:**
- Eyebrow: `DEPARTURE MONO` — "the creature"
- Headline: `Newsreader` italic, ~42px — "the ghost is the product."
- Body: `Inter Tight` 16px, `--fg-2` — "its mood mirrors yours. when you're focused, it's calm. when you're rushing, it's restless. when you're exhausted, it droops. you understand how you're doing by looking at how it's doing."

**Background:** `--bg-1` with dark fabric texture at 3-5% opacity.

**Motion:** Sprites drift independently using offset sine waves (different phase per sprite, same 4s period). On scroll-enter, sprites fade in with stagger (50ms each) from center outward. Product mockup has subtle parallax (0.85x scroll speed).

**Detail:** The `sleeping` sprite is at 40% opacity, slightly separated from the cluster.

**Mobile:** Single column. Text first, sprite cluster below (tighter arrangement), mockup below that.

---

### 7. Lightweight — LIGHT

**Purpose:** Answer "will it slow down my computer?"

**Layout:** Left column: three metrics in a vertical stack with generous spacing. NOT cards, NOT a horizontal row. Right column or inline: feather image (Asset #6) floating beside the metrics.

**Each metric:**
- Number: `DEPARTURE MONO`, 64px, `--fg-ink`
- Label: `Inter Tight`, 15px, `--fg-ink-2`

**Content:**
- "< 1%" — "cpu usage while running. no impact on gaming, editing, or heavy workloads."
- "0 bytes" — "sent to any server. ever. all processing happens on your machine."
- "60 seconds" — "aggregation window. raw events are discarded. only the rhythm remains."

**Section header:**
- Eyebrow: `DEPARTURE MONO` — "lightweight"
- Headline: `Newsreader` italic, ~36px — "you won't notice it's there."

**Background:** Warm paper texture.

**Motion:** Numbers count up on scroll-enter (0 → target over 800ms). Labels fade in 200ms after their number lands. Stagger between metrics: 200ms.

**Mobile:** Single column. Feather hidden or repositioned above the section header at small size.

---

### 8. Privacy & Data — LIGHT

**Purpose:** Build trust. Explain what Polter collects and how the user controls it.

**Layout:** Two parts stacked vertically with `--sp-9` (96px) between them.

**Part A — What Polter sees vs. never sees:**
Asymmetric two-column.

Left column — "what polter sees":
- Header: `DEPARTURE MONO` 11px, `--mood-calm` (sage) — "WHAT POLTER SEES"
- Items: `Inter Tight` 16px, `--fg-ink`, each on its own line with `1px --border-light` separator and `--sp-4` padding
- Content: "keystroke timing — when, not what" / "mouse path and idle gaps" / "window switches and focus durations" / "time of day and day of week"

Right column — "what polter never sees":
- Header: `DEPARTURE MONO` 11px, `--danger` (`#b86a5e`) — "WHAT POLTER NEVER SEES"
- Items: same styling but `--fg-ink-2` with `text-decoration: line-through`, strikethrough color `--danger` at 50% opacity
- Content: "the words you type" / "the websites you visit" / "the contents of your screen" / "anything sent to a server"

**Part B — The tier system:**
Three blocks separated by vertical `1px --border-light` dividers (not cards). Side by side on desktop.

Each tier:
- Label: `DEPARTURE MONO` eyebrow — "TIER 1 · AUTOMATIC", "TIER 2 · OPT-IN", "TIER 3 · FUTURE"
- Description: `Inter Tight` 15px, `--fg-ink-2`, 2-3 sentences

Tier content (sourced from `docs/DATA.md`):
- Tier 1: "keystroke timing, mouse behavior, app focus, system activity. collected from install. no content, only patterns."
- Tier 2: "screen content classification, clipboard frequency, calendar proximity. each one asked separately during setup. skip any or all."
- Tier 3: "webcam and microphone signals. not in the current release. designed and waiting for when it's ready."

**Section header:**
- Eyebrow: `DEPARTURE MONO` — "privacy"
- Headline: `Newsreader` italic, ~48px — "everything stays on your machine." + `--fg-ink-3` "no account. no upload."

**Closing statement:** `Inter Tight` 15px, `--fg-ink-2` — "polter learns your baseline by watching patterns over weeks. the raw events are discarded. only the rhythm remains. you can delete that rhythm any time."

**Background:** `--bg-paper` with warm paper texture.

**Motion:** List items stagger on scroll (80ms per item). Strikethrough on "never sees" items animates left-to-right as they appear.

**Mobile:** Single column. "Sees" list first, "never sees" below. Tiers stack vertically.

---

### 9. Download / GitHub CTA — DARK

**Purpose:** Final conversion point. Repeated call-to-action after full pitch.

**Layout:** Centered — this is the ONE section where centering is correct. Single focal point.

**Content:**
- Ghost: front-facing sprite (existing asset), 192px (4x scale), slow 4s drift, `--glow-ghost` halo
- Headline: `Newsreader` italic, ~48px, `--fg-1` — "let something notice."
- Button: Candlelight filled, `--radius-md` — "View on GitHub"
- Below button: `DEPARTURE MONO` 11px, `--fg-3` — "open source · mit licensed · windows"

**Background:** `--bg-0` with dark fabric texture. Warm candlelight radial vignette behind ghost at ~8% opacity (CSS).

**Motion:** Ghost fades in at 60% opacity, slowly resolves to 80% over 1s. Headline fades up 300ms later. Button fades up 500ms later.

**Mobile:** Same layout, ghost at 144px (3x scale).

---

### 10. Footer — DARK

**Purpose:** Logo, links, sign-off.

**Layout:** Two rows.
- Top: ghost sprite (32px) + "polter" wordmark (`Newsreader` italic, 24px) left. Links right: `DEPARTURE MONO` 11px uppercase — github, changelog, contact.
- Bottom: `1px --border-1` separator. Tagline left: "made by people who didn't want another app to check." Copyright right: "2026 · mit licensed." Both in `DEPARTURE MONO` 10px, `--fg-3`.

**Motion:** None. Static. The page has settled.

**Mobile:** Single column. Logo and links stack.

---

## Image & Asset Inventory

### Asset Types

| Type | Definition |
|---|---|
| **Existing Asset** | Already in the repo — sprites, screenshots from the real app |
| **Realistic** | Photorealistic — looks like a photograph of a real thing |
| **Themed** | Brand-consistent generated imagery — stylized objects matching Polter's aesthetic |
| **Texture** | Tileable surface material for background treatment |
| **Composite** | Built from existing assets + framing/composition work |

### Asset Table

| # | Asset | Section | Aspect | Background | Type | Description |
|---|---|---|---|---|---|---|
| 1 | Warm paper texture | All LIGHT sections | Tileable, ~2048x2048 | Opaque, warm off-white | **Texture** | High-res scan of aged warm paper. Slight fiber, subtle grain, no creases. Color range: `#f3f1ec` to `#ebe7df`. Applied at 40-60% opacity over flat `--bg-light`. |
| 2 | Dark fabric texture | All DARK sections | Tileable, ~2048x2048 | Opaque, near-black | **Texture** | Close-up of dark wool felt or fine linen. Subtle woven structure. Color range: `#0e0f12` to `#15171c`. Applied at 3-5% opacity over `--bg-0`. |
| 3 | Desk scene — night | Hero (right column) | 16:10 | Opaque, vignetted to black at edges | **Realistic** | Moody overhead or 3/4-angle shot of a real desk at night. Monitor glowing (screen content blurred/dark), mechanical keyboard, coffee mug optional. Warm desk lamp spill. Ghost sprite composited on monitor via code, not baked in. Edges vignette to black to blend with `--bg-0`. |
| 4 | Product screenshot | Creature section | 16:10 | Opaque dark, vignetted edges | **Composite** | Actual screenshot of Polter running — ghost floating on a dark desktop with insight bubble visible. Built from real app or UI kit prototype. Framed in minimal device mockup (thin bezel, rounded corners). Not generated — captured and composed. |
| 5 | Research journal | Science section (margin) | 4:3 | Transparent (object cutout) | **Themed** | Single worn research journal/notebook, slightly open, viewed from above at an angle. Cream pages, dark cover. Pen resting on it optional. Not readable text — atmospheric. Desaturated, muted tones. Floats in margin between columns. |
| 6 | Feather | Lightweight section | ~1:2 (tall, portrait) | Transparent (object cutout) | **Themed** | Single feather — light, delicate, slightly translucent. Warm grey/white tones. Isolated on transparent background. Communicates "weightless" without saying it. |
| 7 | Ghost sprites (all) | Creature section, Hero, CTA, Footer | 1:1 (48x48 native) | Transparent | **Existing Asset** | 8 direction sprites in `design/final/assets/ghost/`. Mood + action sprites in `design/v2/ghost/`. Always rendered with `image-rendering: pixelated` at integer scale multiples. |

**Total: 6 images to produce + existing assets.**

---

## Creature Web Demo

The ghost lives on the website as an interactive demo. Visitors can watch it float, drag it, throw it, and see it cycle through moods with sample insight bubbles. This is the primary differentiator — the product sells itself by being present on the page.

### What the web demo includes

- Ghost rendering (sprites on canvas or DOM, `image-rendering: pixelated`)
- Full physics: simplex-noise wander, drag, throw, bounce, wall collision, settle, relaunch
- 8-direction sprite selection from velocity vector
- Mood state cycling on a timer (demo mode — cycles through focus → calm → spark → fade → rest)
- Mood sprites replace direction sprites during idle wander
- Action sprites: grab (on pointerdown), thrown sequence, falling sequence
- Fun behaviors: reading, box, umbrella on random timer
- Sample insight bubbles that appear periodically with pre-written observations
- Flip rule: physics sprites flip horizontally based on velocity direction

### What the web demo does NOT include

- AI inference (no OpenRouter, no Ollama)
- Real sensor data (no keyboard/mouse monitoring of the visitor)
- SQLite storage
- Baseline or state classification from real signals
- System tray, click-through, or any Tauri-specific features
- Onboarding flow

### Demo behavior on the website

The ghost floats freely on the page (position: fixed, z-index above content but below modals). It wanders using the same simplex-noise algorithm as the desktop app. Visitors can:
- Watch it drift and change moods
- Drag it (shows `grab.png`)
- Throw it (full throw → fall → recover sequence)
- See it settle on surfaces occasionally
- See random fun behaviors (reading a book, hiding in a box)
- See sample insight bubbles appear every ~30 seconds

The ghost respects viewport bounds (work area = browser viewport minus any fixed nav). Position saved to localStorage as percentage of viewport.

### Platform abstraction

The creature code needs a thin abstraction layer so the same physics/animation logic works in both environments:

| Capability | Desktop (Tauri) | Web (Next.js) |
|---|---|---|
| Work area bounds | `currentMonitor().workArea` via Tauri API | `window.innerWidth / innerHeight` |
| Position persistence | Tauri store plugin | `localStorage` |
| Mood state source | Real classifier from Rust backend | Timer-based demo cycling |
| Insight trigger | `insight_ready` Tauri event | `setInterval` with pre-written pool |
| Click-through | Rust polling loop + `set_ignore_cursor_events` | Not applicable (ghost is always interactive) |
| System events | `sleep_toggled`, `privacy_toggled`, etc. | Not applicable |

The abstraction is an interface (TypeScript) that each platform implements:

```typescript
interface CreaturePlatform {
  getWorkArea(): { width: number; height: number };
  savePosition(pct: { x: number; y: number }): void;
  loadPosition(): { x: number; y: number } | null;
  onMoodChange(callback: (mood: MoodState) => void): () => void;
  onInsightReady(callback: (insight: Insight) => void): () => void;
}
```

Desktop passes the Tauri implementation. Web passes the demo implementation. The creature hooks (`useCreaturePhysics`, `useCreatureAnimation`) accept this interface and never import Tauri directly.

---

## Monorepo Restructure

> **Priority: last.** Build the website first using copied creature code if needed. Restructure into monorepo afterward when both apps are working.

### Why

The creature UI (physics, animation, sprites, rendering) is ~90% pure React/DOM/canvas. Sharing it as a package means one source of truth — update the creature once, both desktop and web get it.

### Target Structure

```
polter/
├── packages/
│   └── creature-ui/              # Shared creature package
│       ├── src/
│       │   ├── components/
│       │   │   ├── Creature.tsx
│       │   │   └── Bubble.tsx
│       │   ├── hooks/
│       │   │   ├── useCreaturePhysics.ts
│       │   │   ├── useCreatureAnimation.ts
│       │   │   ├── useCreaturePosition.ts
│       │   │   ├── useIdleDetection.ts
│       │   │   ├── usePreInsightGlow.ts
│       │   │   └── useInsightQueue.ts
│       │   ├── lib/
│       │   │   ├── physics.ts
│       │   │   ├── spriteConfig.ts
│       │   │   └── platform.ts       # CreaturePlatform interface
│       │   └── assets/
│       │       └── sprites/           # All ghost sprites
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   ├── desktop/                       # Tauri app (current src/ and src-tauri/)
│   │   ├── src/
│   │   │   ├── platform/
│   │   │   │   └── tauri.ts           # Tauri CreaturePlatform implementation
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Settings.tsx
│   │   │   │   └── Onboarding.tsx
│   │   │   └── ...                    # Desktop-specific UI
│   │   ├── src-tauri/                 # Rust backend (unchanged)
│   │   └── package.json
│   └── web/                           # Next.js marketing site
│       ├── src/
│       │   ├── app/                   # Next.js App Router pages
│       │   │   ├── page.tsx           # Landing page (all 10 sections)
│       │   │   └── layout.tsx
│       │   ├── platform/
│       │   │   └── web.ts             # Web CreaturePlatform implementation
│       │   ├── components/
│       │   │   └── sections/          # One component per landing page section
│       │   └── ...
│       └── package.json
├── design/                            # Design system (stays at root)
│   └── final/
├── docs/                              # Documentation (stays at root)
├── package.json                       # Root workspace config
├── pnpm-workspace.yaml
└── turbo.json                         # Turborepo config
```

### Tooling

- **pnpm workspaces** for package management
- **Turborepo** for build orchestration (`turbo run dev`, `turbo run build`)
- `creature-ui` published as internal workspace package only (not to npm)

### Migration steps

1. Set up pnpm workspace and Turborepo at root
2. Move current frontend code to `apps/desktop/`
3. Move current `src-tauri/` to `apps/desktop/src-tauri/`
4. Extract creature-related hooks, components, and assets into `packages/creature-ui/`
5. Add `CreaturePlatform` interface to `packages/creature-ui/src/lib/platform.ts`
6. Create Tauri platform implementation in `apps/desktop/src/platform/tauri.ts`
7. Create web platform implementation in `apps/web/src/platform/web.ts`
8. Update imports in desktop app to use `@polter/creature-ui`
9. Scaffold Next.js app in `apps/web/`
10. Verify both `turbo run dev` (desktop) and `turbo run dev --filter=web` work

### What stays in desktop only

- All Rust backend code (`src-tauri/`)
- Dashboard, Settings, Onboarding pages
- System tray logic
- Click-through logic
- Real sensor integration
- Tauri plugins (store, autostart, single-instance)

### What moves to creature-ui

- `Creature.tsx`
- `Bubble.tsx`
- `useCreaturePhysics.ts`
- `useCreatureAnimation.ts`
- `useCreaturePosition.ts`
- `useIdleDetection.ts`
- `usePreInsightGlow.ts`
- `useInsightQueue.ts`
- `physics.ts`
- `spriteConfig.ts`
- `ghostUrls.ts`
- All sprite assets
- `simplex-noise` dependency

---

## Voice & Copy Reference

All website copy follows the Polter voice rules from `design/final/README.md`. Summary:

**Ghost speaking (insight examples, hero headline):** Second person, lowercase, present tense. One sentence, maybe two. Observational, never prescriptive. No exclamation marks, no emoji, no greetings, no sign-offs, no questions.

**Product speaking (section descriptions, labels, buttons):** Lowercase headlines. Sentence case for UI labels. Short sentences. Plain words. No "AI," no "intelligence," no "smart." Buttons are verbs: "download", "view on github". Not "Get Started Today".

**Casing rules:**

| Surface | Case |
|---|---|
| Ghost speech | all lowercase |
| Marketing headlines | all lowercase |
| UI labels, buttons | Sentence case |
| Eyebrows / metadata | UPPERCASE with wide tracking, mono font |

---

## What This Spec Does Not Cover

- Deployment infrastructure (hosting, CDN, domain)
- SEO and meta tags
- Analytics
- Blog or changelog pages
- Mobile app or native companion
- Pricing (free and open source)
- User authentication (none — no accounts)
