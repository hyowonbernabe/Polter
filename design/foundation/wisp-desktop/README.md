# Wisp Desktop — UI Kit

The single product surface. A transparent overlay layer that sits above the user's desktop wallpaper, painting only:

1. **The Wisp** — pixel sprite + radial bloom, drifting in a corner. Always visible.
2. **The Insight Card** — frosted-glass panel that blooms in next to the wisp when there's something to say.
3. **The Dashboard** — larger frosted-glass surface, summoned by clicking the wisp.

## Files

- `index.html` — interactive prototype. Click the wisp to summon the dashboard. Hover to reveal the insight. Use the controls in the top-right to switch states.
- `Wisp.jsx` — the sprite + bloom, with breathing animation
- `InsightCard.jsx` — the small panel that says one thing
- `Dashboard.jsx` — the larger summary panel
- `Wallpaper.jsx` — fake desktop wallpaper so the transparency reads (recreations only)
- `StateChip.jsx` — pixel-label chip with glow pip
- `data.js` — sample state copy + insight strings, all in voice

## Design notes

- Pixel sprite is `assets/sprites/wisp-{state}.png`, 16×32 base, scaled 4× via CSS (`width: 64px`).
- The bloom behind the sprite is a radial gradient + `box-shadow` matching the state color.
- All panels use the `panel` class from `colors_and_type.css` — frosted glass, hairline border, soft float shadow.
- Insight text is **lowercase, observational, never prescriptive**. See voice rules in root README.
- This is a recreation/prototype. The "watching how you work" inputs are mocked.
