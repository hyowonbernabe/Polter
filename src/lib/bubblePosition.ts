export interface MonitorInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TailSide = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface BubblePosition {
  x: number;
  y: number;
  tailSide: TailSide;
}

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

export function getBubblePosition(
  creatureX: number,
  creatureY: number,
  spriteSize: number,
  monitors: MonitorInfo[],
  bubbleW: number,
  bubbleH: number,
): BubblePosition {
  const cx = creatureX + spriteSize / 2;
  const cy = creatureY + spriteSize / 2;
  const mon = nearestMonitor(cx, cy, monitors);
  const monCx = mon.x + mon.width / 2;
  const monCy = mon.y + mon.height / 2;

  const rightHalf = cx >= monCx;
  const bottomHalf = cy >= monCy;

  let x: number;
  let y: number;
  let tailSide: TailSide;

  if (rightHalf && bottomHalf) {
    x = cx - bubbleW;
    y = creatureY - bubbleH - GAP;
    tailSide = 'bottom-right';
  } else if (!rightHalf && bottomHalf) {
    x = cx;
    y = creatureY - bubbleH - GAP;
    tailSide = 'bottom-left';
  } else if (rightHalf && !bottomHalf) {
    x = cx - bubbleW;
    y = creatureY + spriteSize + GAP;
    tailSide = 'top-right';
  } else {
    x = cx;
    y = creatureY + spriteSize + GAP;
    tailSide = 'top-left';
  }

  x = Math.max(mon.x, Math.min(x, mon.x + mon.width - bubbleW));
  y = Math.max(mon.y, Math.min(y, mon.y + mon.height - bubbleH));

  return { x, y, tailSide };
}
