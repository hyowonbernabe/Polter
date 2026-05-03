import { describe, it, expect } from "vitest";
import { pxToPct, pctToPx, clampToSafeZone } from "./useCreaturePosition";

const WA = { x: 0, y: 0, width: 1920, height: 1040 };
const SPRITE = { w: 64, h: 128 };

describe("pxToPct", () => {
  it("converts pixel to percentage", () => {
    expect(pxToPct(960, 1920)).toBeCloseTo(0.5);
    expect(pxToPct(0, 1920)).toBe(0);
    expect(pxToPct(1920, 1920)).toBe(1);
  });
});

describe("pctToPx", () => {
  it("converts percentage to pixel", () => {
    expect(pctToPx(0.5, 1920)).toBe(960);
    expect(pctToPx(0, 1920)).toBe(0);
    expect(pctToPx(1, 1920)).toBe(1920);
  });
});

describe("clampToSafeZone", () => {
  it("clamps negative position to work area origin", () => {
    const c = clampToSafeZone(-10, -10, WA, SPRITE);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
  });

  it("clamps overflow to bottom-right boundary", () => {
    const c = clampToSafeZone(9999, 9999, WA, SPRITE);
    expect(c.x).toBe(WA.width - SPRITE.w);
    expect(c.y).toBe(WA.height - SPRITE.h);
  });

  it("leaves valid positions unchanged", () => {
    const c = clampToSafeZone(800, 400, WA, SPRITE);
    expect(c.x).toBe(800);
    expect(c.y).toBe(400);
  });
});
