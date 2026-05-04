import { describe, it, expect } from 'vitest';
import { getBubblePosition, type MonitorInfo } from './bubblePosition';

const MON: MonitorInfo = { x: 0, y: 0, width: 1920, height: 1080 };
const SPRITE = 64;
const BUBBLE = { w: 300, h: 180 };

describe('getBubblePosition', () => {
  it('creature in lower half → bubble above, tail bottom', () => {
    const r = getBubblePosition(1600, 800, SPRITE, [MON], BUBBLE.w, BUBBLE.h);
    expect(r.tailSide).toBe('bottom');
    expect(r.y).toBeLessThan(800);
  });

  it('creature in upper half → bubble below, tail top', () => {
    const r = getBubblePosition(100, 50, SPRITE, [MON], BUBBLE.w, BUBBLE.h);
    expect(r.tailSide).toBe('top');
    expect(r.y).toBeGreaterThan(50 + SPRITE);
  });

  it('bubble is centered horizontally over the creature', () => {
    const r = getBubblePosition(1600, 800, SPRITE, [MON], BUBBLE.w, BUBBLE.h);
    const creatureCx = 1600 + SPRITE / 2;
    const bubbleCx = r.x + BUBBLE.w / 2;
    // bubble center aligns with creature center (may be clamped)
    expect(Math.abs(bubbleCx - creatureCx)).toBeLessThanOrEqual(BUBBLE.w / 2);
  });

  it('clamps bubble so it never leaves monitor bounds', () => {
    const r = getBubblePosition(1890, 10, SPRITE, [MON], BUBBLE.w, BUBBLE.h);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x + BUBBLE.w).toBeLessThanOrEqual(1920);
    expect(r.y + BUBBLE.h).toBeLessThanOrEqual(1080);
  });

  it('falls back to primary monitor when list is empty', () => {
    const r = getBubblePosition(100, 100, SPRITE, [], BUBBLE.w, BUBBLE.h);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
  });
});
