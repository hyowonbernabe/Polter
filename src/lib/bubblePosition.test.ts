import { describe, it, expect } from 'vitest';
import { getBubblePosition, type MonitorInfo } from './bubblePosition';

const MON: MonitorInfo = { x: 0, y: 0, width: 1920, height: 1080 };
const SPRITE = 64;
const BUBBLE_W = 300;
const VIEWPORT_H = 1080;

describe('getBubblePosition', () => {
  it('creature in lower half → tailSide bottom, y is CSS bottom offset', () => {
    const r = getBubblePosition(1600, 800, SPRITE, [MON], BUBBLE_W, VIEWPORT_H);
    expect(r.tailSide).toBe('bottom');
    // CSS bottom offset: viewportH - creatureY + GAP = 1080 - 800 + 12 = 292
    expect(r.y).toBe(292);
  });

  it('creature in upper half → tailSide top, y is CSS top offset', () => {
    const r = getBubblePosition(100, 50, SPRITE, [MON], BUBBLE_W, VIEWPORT_H);
    expect(r.tailSide).toBe('top');
    // CSS top: creatureY + spriteSize + GAP = 50 + 64 + 12 = 126
    expect(r.y).toBe(126);
  });

  it('bubble is centered horizontally over the creature', () => {
    const r = getBubblePosition(1600, 800, SPRITE, [MON], BUBBLE_W, VIEWPORT_H);
    const creatureCx = 1600 + SPRITE / 2;
    // Without clamping: x = creatureCx - 150 = 1632 - 150 = 1482
    expect(r.x).toBe(Math.max(MON.x, Math.min(creatureCx - BUBBLE_W / 2, MON.x + MON.width - BUBBLE_W)));
  });

  it('clamps x so bubble never leaves monitor bounds', () => {
    const r = getBubblePosition(1890, 10, SPRITE, [MON], BUBBLE_W, VIEWPORT_H);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + BUBBLE_W).toBeLessThanOrEqual(1920);
  });

  it('falls back when monitor list is empty', () => {
    const r = getBubblePosition(100, 100, SPRITE, [], BUBBLE_W, VIEWPORT_H);
    expect(r.x).toBeGreaterThanOrEqual(0);
  });
});
