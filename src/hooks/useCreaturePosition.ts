import { useCallback, useEffect, useRef, useState } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";

export interface WorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MonitorInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STORE_FILE = "wisp-settings.json";
const POS_KEY = "creature_position";

const REFERENCE_HEIGHT = 1080;
const REFERENCE_SPRITE_PX = 64;

// Sprite scales with the PRIMARY monitor's physical pixel height.
// Multiplying by devicePixelRatio converts CSS logical pixels → physical pixels,
// so the sprite stays the same physical size regardless of DPI scaling level.
export function spriteDisplaySize(): number {
  const physicalHeight = window.screen.height * window.devicePixelRatio;
  return Math.round((physicalHeight / REFERENCE_HEIGHT) * REFERENCE_SPRITE_PX);
}

export function pxToPct(px: number, total: number): number {
  return px / total;
}

export function pctToPx(pct: number, total: number): number {
  return Math.round(pct * total);
}

// Clamp (x, y) so the sprite stays within the nearest monitor's work area.
// Picks the monitor whose work area contains the sprite center, or the closest one.
export function clampToMonitors(
  x: number,
  y: number,
  monitors: MonitorInfo[],
  sprite: { w: number; h: number }
): { x: number; y: number } {
  if (monitors.length === 0) return { x, y };

  const cx = x + sprite.w / 2;
  const cy = y + sprite.h / 2;

  // Find which monitor the sprite center is in, or closest by distance.
  let best = monitors[0];
  let bestDist = Infinity;
  for (const m of monitors) {
    const inX = cx >= m.x && cx <= m.x + m.width;
    const inY = cy >= m.y && cy <= m.y + m.height;
    if (inX && inY) { best = m; break; }
    // Manhattan distance to monitor center
    const dist = Math.abs(cx - (m.x + m.width / 2)) + Math.abs(cy - (m.y + m.height / 2));
    if (dist < bestDist) { bestDist = dist; best = m; }
  }

  return {
    x: Math.max(best.x, Math.min(x, best.x + best.width - sprite.w)),
    y: Math.max(best.y, Math.min(y, best.y + best.height - sprite.h)),
  };
}

export function useCreaturePosition(
  onBoundsChange: (x: number, y: number, w: number, h: number) => void
) {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [workArea, setWorkArea] = useState<WorkArea>({ x: 0, y: 0, width: 1920, height: 1080 });
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const storeRef = useRef<Store | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monitorsRef = useRef<MonitorInfo[]>([]);

  const spriteSize = spriteDisplaySize();
  const sprite = { w: spriteSize, h: spriteSize };

  useEffect(() => {
    async function init() {
      const wa: WorkArea = {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
      setWorkArea(wa);

      // Fetch per-monitor work areas from Rust
      let mons: MonitorInfo[] = [];
      try {
        mons = await invoke<MonitorInfo[]>("get_monitors");
      } catch {
        // Fallback: treat the whole viewport as one monitor
        mons = [{ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }];
      }
      setMonitors(mons);
      monitorsRef.current = mons;

      const size = spriteDisplaySize();
      const sp = { w: size, h: size };

      const store = await Store.load(STORE_FILE);
      storeRef.current = store;

      const saved = await store.get<{ xPct: number; yPct: number }>(POS_KEY);
      if (saved) {
        const px = pctToPx(saved.xPct, wa.width) + wa.x;
        const py = pctToPx(saved.yPct, wa.height) + wa.y;
        const clamped = clampToMonitors(px, py, mons, sp);
        setPos(clamped);
        onBoundsChange(clamped.x, clamped.y, sp.w, sp.h);
      } else {
        // Default to bottom-right of the primary monitor (first in list)
        const primary = mons[0] ?? { x: 0, y: 0, width: wa.width, height: wa.height };
        const margin = 16;
        const def = {
          x: Math.round(primary.x + primary.width  - size - margin),
          y: Math.round(primary.y + primary.height - size - margin),
        };
        setPos(def);
        onBoundsChange(def.x, def.y, sp.w, sp.h);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePosition = useCallback(
    (x: number, y: number) => {
      if (!storeRef.current || workArea.width === 0) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const xPct = pxToPct(x - workArea.x, workArea.width);
        const yPct = pxToPct(y - workArea.y, workArea.height);
        await storeRef.current!.set(POS_KEY, { xPct, yPct });
        await storeRef.current!.save();
      }, 300);
    },
    [workArea]
  );

  const updatePosition = useCallback(
    (x: number, y: number) => {
      const clamped = clampToMonitors(x, y, monitorsRef.current, sprite);
      setPos(clamped);
      savePosition(clamped.x, clamped.y);
      onBoundsChange(clamped.x, clamped.y, sprite.w, sprite.h);
    },
    [sprite, savePosition, onBoundsChange]
  );

  return { pos, workArea, monitors, spriteSize, updatePosition };
}
