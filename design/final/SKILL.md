---
name: polter-design
description: Use this skill to generate well-branded interfaces and assets for Polter, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# Polter design skill

Polter is a silent desktop companion: a small pixel-art ghost that watches how you work — never what you type — and occasionally tells you something true about yourself. The design system is quiet, observational, late-night calm. Low saturation. Pixel art is sacred. The ghost is the only icon we ever need.

## How to use this skill

1. **Read `README.md`** in this folder first. It contains the voice rules, visual foundations, and iconography decisions. Read it fully — the voice and visual restraint are the most important things to get right.
2. **Read `colors_and_type.css`** to understand the design tokens. Always use the CSS variables — never hardcode colors.
3. **Browse `ui_kits/`** for full component examples:
   - `ui_kits/desktop/` — the actual product (ghost overlay, insight bubble, dashboard).
   - `ui_kits/website/` — the marketing site.
4. **Reuse `assets/ghost/`** for any ghost imagery. Eight 48×48 sprites, one per facing. Always render with `image-rendering: pixelated` (use the `.pixel-art` helper class). Scale at integer multiples only — 1×, 2×, 3×, 4×.
5. **Browse `preview/`** for small specimen cards — useful as visual references for color, type, spacing, components.

## When making something new

- **Voice**: lowercase, second person, present tense. one sentence, maybe two. observational, never prescriptive. no exclamation marks, no emoji, no greetings, no sign-offs, no questions to the user. sample: *"you've been still for a while. that's unusual for a tuesday."*
- **Color**: stay low-saturation. on dark surfaces the bg is `#0e0f12` to `#242832` — never pure black. on light it's warm paper `#f3f1ec` / `#ebe7df`. accent is `#d4b87a` (candlelight) used sparingly. mood colors are sage / clay / dusk lavender / deep slate / candlelight.
- **Type**: Newsreader (italic, lowercase) for the ghost's voice + display. Inter Tight for UI. Departure Mono for meta/eyebrows/code.
- **Iconography**: only the ghost sprite. for unavoidable UI glyphs use Lucide at 1.5px stroke. no emoji, no unicode glyph icons, no decorative SVGs.
- **Motion**: drift, never bounce. fade in/out. ghost idle = 4s sine-wave float.
- **Layout**: generous margins, single column, no chrome. the data and the ghost are the texture.

## Output guidance

If creating visual artifacts (slides, mocks, throwaway prototypes), copy the assets you need from `assets/` and the tokens from `colors_and_type.css` into a static HTML file. If working on production code, copy assets and read the rules in `README.md` to internalize the brand.

If invoked without further guidance, ask the user what they want to build, ask a few questions about scope and surface (overlay vs dashboard vs site), and act as an expert designer who outputs HTML artifacts or production code as needed.
