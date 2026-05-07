# Polter Desktop UI Kit

The actual product. A transparent overlay that hosts the ghost sprite, plus the things the ghost summons: insight bubbles and a behavioral dashboard.

## Files

- `index.html` — interactive demo. Wallpaper background simulates the user's desktop. Click anywhere to dismiss bubbles; press <kbd>D</kbd> to open the dashboard.
- `Ghost.jsx` — the floating sprite. 8-direction facing, mood tinting, idle drift animation.
- `InsightBubble.jsx` — the conversational card the ghost summons.
- `Dashboard.jsx` — full-window pattern view (mood timeline, keystroke rhythm, focus blocks).
- `MoodPill.jsx` / `StatTile.jsx` — small reusable bits.

## What's missing

- No real data layer. State is all in-memory and faked.
- No tray icon / settings — these are mentioned in the dashboard but not built. Ask if needed.
- No actual snooze / pause logic. Buttons are wired but no-op.
