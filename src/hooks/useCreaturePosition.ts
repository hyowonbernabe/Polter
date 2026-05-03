import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";

export interface WorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STORE_FILE = "wisp-settings.json";
const POS_KEY = "creature_position";

// Display size in CSS pixels: source 16×32 at scale ×4.
export const SPRITE_DISPLAY = { w: 64, h: 128 };

export function pxToPct(px: number, total: number): number {
  return px / total;
}

export function pctToPx(pct: number, total: number): number {
  return Math.round(pct * total);
}

export function clampToSafeZone(
  x: number,
  y: number,
  wa: WorkArea,
  sprite: { w: number; h: number }
): { x: number; y: number } {
  return {
    x: Math.max(wa.x, Math.min(x, wa.x + wa.width - sprite.w)),
    y: Math.max(wa.y, Math.min(y, wa.y + wa.height - sprite.h)),
  };
}

function defaultPosition(wa: WorkArea): { x: number; y: number } {
  return {
    x: Math.round(wa.x + wa.width * 0.92 - SPRITE_DISPLAY.w),
    y: Math.round(wa.y + wa.height * 0.88 - SPRITE_DISPLAY.h),
  };
}

export function useCreaturePosition(
  onBoundsChange: (x: number, y: number, w: number, h: number) => void
) {
  const [workArea, setWorkArea] = useState<WorkArea>({ x: 0, y: 0, width: 1920, height: 1040 });
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const storeRef = useRef<Store | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function init() {
      const wa: WorkArea = await invoke("get_work_area");
      setWorkArea(wa);

      const store = await Store.load(STORE_FILE);
      storeRef.current = store;

      const saved = await store.get<{ xPct: number; yPct: number }>(POS_KEY);
      if (saved) {
        const px = pctToPx(saved.xPct, wa.width) + wa.x;
        const py = pctToPx(saved.yPct, wa.height) + wa.y;
        const clamped = clampToSafeZone(px, py, wa, SPRITE_DISPLAY);
        setPos(clamped);
        onBoundsChange(clamped.x, clamped.y, SPRITE_DISPLAY.w, SPRITE_DISPLAY.h);
      } else {
        const def = defaultPosition(wa);
        setPos(def);
        onBoundsChange(def.x, def.y, SPRITE_DISPLAY.w, SPRITE_DISPLAY.h);
      }
    }
    init();
    // onBoundsChange is stable (useCallback in App.tsx) — intentionally omitted.
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
      const clamped = clampToSafeZone(x, y, workArea, SPRITE_DISPLAY);
      setPos(clamped);
      savePosition(clamped.x, clamped.y);
      onBoundsChange(clamped.x, clamped.y, SPRITE_DISPLAY.w, SPRITE_DISPLAY.h);
    },
    [workArea, savePosition, onBoundsChange]
  );

  return { pos, workArea, updatePosition };
}
