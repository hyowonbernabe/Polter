---
name: wisp-design
description: Use this skill to generate well-branded interfaces and assets for Wisp, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Wisp at a glance

A passive desktop companion — a small glowing pixel-art spirit that lives quietly over the user's desktop and silently reflects their cognitive and emotional state. **Invisible until it has something to say.**

The visual language has a deliberate two-part nature:

- **Pixel art** for the creature itself and its in-world labels (state names, timestamps).
- **Clean sans-serif on dark frosted glass** for everything the user reads as a sentence.

Voice is **lowercase, second-person, present tense, observational**. Never prescriptive, never cheerful, no emoji, no exclamation marks.

## Files in this skill

- `README.md` — full system: visual foundations, content fundamentals, iconography, font substitutions
- `colors_and_type.css` — every CSS variable (colors, type, spacing, radii, shadows, glow, motion) and the `.panel`, `.type-*`, and animation helper classes
- `assets/sprites/` — wisp pixel sprites in seven states (focus, calm, deep, spark, burn, fade, rest)
- `assets/logo.svg`, `assets/icon.svg` — wordmark + icon-only lockup
- `assets/noise.png` — subtle starfield/grain texture
- `ui_kits/wisp-desktop/` — interactive recreation: wisp + insight card + dashboard, with reusable JSX components
- `preview/` — design system specimen cards (colors, type, spacing, components, voice examples)
