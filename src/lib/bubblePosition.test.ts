import { describe, it, expect } from 'vitest';
import { getBubblePosition, type MonitorInfo } from './bubblePosition';

const MON: MonitorInfo = { x: 0, y: 0, width: 1920, height: 1080 };
const SPRITE_W = 64;
const SPRITE_H = 128; // 2x aspect ratio like the actual 16×32 sprites
const BUBBLE_W = 300;
const VIEWPORT_H = 1080;

describe('getBubblePosition', () => {
  it('creature in lower half → tailSide bottom, y is CSS bottom offset', () => {
    // cy = 800 + 64 = 864 >= monCy 540 → aboveCreature
    const r = getBubblePosition(1600, 800, SPRITE_W, SPRITE_H, [MON], BUBBLE_W, VIEWPORT_H);
    expect(r.tailSide).toBe('bottom');
    // y = viewportH - creatureY + GAP = 1080 - 800 + 12 = 292
    expect(r.y).toBe(292);
  });

  it('creature in upper half → tailSide top, y is CSS top offset', () => {
    // cy = 50 + 64 = 114 < monCy 540 → below creature
    const r = getBubblePosition(100, 50, SPRITE_W, SPRITE_H, [MON], BUBBLE_W, VIEWPORT_H);
    expect(r.tailSide).toBe('top');
    // y = creatureY + spriteH + GAP = 50 + 128 + 12 = 190
    expect(r.y).toBe(190);
  });

  it('bubble is centered horizontally over the creature', () => {
    const r = getBubblePosition(1600, 800, SPRITE_W, SPRITE_H, [MON], BUBBLE_W, VIEWPORT_H);
    const creatureCx = 1600 + SPRITE_W / 2;
    const expected = Math.max(MON.x, Math.min(creatureCx - BUBBLE_W / 2, MON.x + MON.width - BUBBLE_W));
    expect(r.x).toBe(expected);
  });

  it('clamps x so bubble never leaves monitor bounds', () => {
    const r = getBubblePosition(1890, 10, SPRITE_W, SPRITE_H, [MON], BUBBLE_W, VIEWPORT_H);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + BUBBLE_W).toBeLessThanOrEqual(1920);
  });

  it('falls back when monitor list is empty', () => {
    const r = getBubblePosition(100, 100, SPRITE_W, SPRITE_H, [], BUBBLE_W, VIEWPORT_H);
    expect(r.x).toBeGreaterThanOrEqual(0);
  });
});
