export interface MonitorInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TailSide = 'top' | 'bottom';

const GAP = 12;

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

export interface BubblePosition {
  x: number;
  /** For tailSide 'bottom': CSS `bottom` offset (anchors bubble bottom edge near wisp).
   *  For tailSide 'top':    CSS `top` offset (anchors bubble top edge near wisp). */
  y: number;
  tailSide: TailSide;
}

export function getBubblePosition(
  creatureX: number,
  creatureY: number,
  spriteSize: number,
  monitors: MonitorInfo[],
  bubbleW: number,
  viewportH: number,
): BubblePosition {
  const cx = creatureX + spriteSize / 2;
  const cy = creatureY + spriteSize / 2;
  const mon = nearestMonitor(cx, cy, monitors);
  const monCy = mon.y + mon.height / 2;

  const aboveCreature = cy >= monCy;

  let x = cx - bubbleW / 2;
  let y: number;
  let tailSide: TailSide;

  if (aboveCreature) {
    // Anchor bubble's bottom edge to just above the creature.
    // y = CSS `bottom` value: distance from viewport bottom to bubble bottom edge.
    y = viewportH - creatureY + GAP;
    tailSide = 'bottom';
  } else {
    // Anchor bubble's top edge to just below the creature.
    // y = CSS `top` value.
    y = creatureY + spriteSize + GAP;
    tailSide = 'top';
  }

  x = Math.max(mon.x, Math.min(x, mon.x + mon.width - bubbleW));

  return { x, y, tailSide };
}
