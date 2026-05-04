export interface MonitorInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TailSide = 'top' | 'bottom';

export interface BubblePosition {
  x: number;
  /** For tailSide 'bottom': CSS `bottom` value (distance from viewport bottom to bubble bottom edge).
   *  For tailSide 'top':    CSS `top` value (distance from viewport top to bubble top edge). */
  y: number;
  tailSide: TailSide;
  /** Horizontal offset of the tail arrow from the bubble's left edge, in px.
   *  Always points at the sprite center even when the bubble is clamped to a screen edge. */
  tailOffset: number;
}

// Negative = bubble overlaps the sprite slightly so the tail looks attached.
const GAP = -4;
// Minimum px from bubble edge to keep the tail arrow visually inside the bubble.
const TAIL_MIN = 16;

function nearestMonitor(cx: number, cy: number, monitors: MonitorInfo[]): MonitorInfo {
  if (monitors.length === 0) {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
    return { x: 0, y: 0, width: w, height: h };
  }
  let best = monitors[0];
  let bestDist = Infinity;
  for (const m of monitors) {
    if (cx >= m.x && cx <= m.x + m.width && cy >= m.y && cy <= m.y + m.height) return m;
    const dist =
      Math.abs(cx - (m.x + m.width / 2)) + Math.abs(cy - (m.y + m.height / 2));
    if (dist < bestDist) { bestDist = dist; best = m; }
  }
  return best;
}

export function getBubblePosition(
  creatureX: number,
  creatureY: number,
  spriteW: number,
  spriteH: number,
  monitors: MonitorInfo[],
  bubbleW: number,
  viewportH: number,
): BubblePosition {
  const cx = creatureX + spriteW / 2;
  const cy = creatureY + spriteH / 2;
  const mon = nearestMonitor(cx, cy, monitors);
  const monCy = mon.y + mon.height / 2;

  const aboveCreature = cy >= monCy;

  // Center bubble over sprite, then clamp to monitor bounds.
  let x = cx - bubbleW / 2;
  x = Math.max(mon.x, Math.min(x, mon.x + mon.width - bubbleW));

  let y: number;
  let tailSide: TailSide;

  if (aboveCreature) {
    y = viewportH - creatureY + GAP;
    tailSide = 'bottom';
  } else {
    y = creatureY + spriteH + GAP;
    tailSide = 'top';
  }

  // Tail offset: where the sprite center falls relative to the (possibly clamped) bubble left edge.
  const tailOffset = Math.max(TAIL_MIN, Math.min(cx - x, bubbleW - TAIL_MIN));

  return { x, y, tailSide, tailOffset };
}
