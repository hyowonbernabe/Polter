import { describe, it, expect } from 'vitest';
import { getBubblePosition, type MonitorInfo } from './bubblePosition';

const MON: MonitorInfo = { x: 0, y: 0, width: 1920, height: 1080 };
const SPRITE = 64;
const BUBBLE = { w: 300, h: 180 };

describe('getBubblePosition', () => {
  it('creature bottom-right → bubble above-left, tail bottom-right', () => {
    // Creature at (1600, 800) — right and below center (960, 540)
    const r = getBubblePosition(1600, 800, SPRITE, [MON], BUBBLE.w, BUBBLE.h);
    expect(r.tailSide).toBe('bottom-right');
    // Bubble x should be left of creature center
    expect(r.x).toBeLessThan(1600 + SPRITE / 2);
    // Bubble y should be above creature
    expect(r.y).toBeLessThan(800);
  });

  it('creature bottom-left → bubble above-right, tail bottom-left', () => {
    const r = getBubblePosition(100, 800, SPRITE, [MON], BUBBLE.w, BUBBLE.h);
    expect(r.tailSide).toBe('bottom-left');
    expect(r.x).toBeGreaterThan(100);
    expect(r.y).toBeLessThan(800);
  });

  it('creature top-right → bubble below-left, tail top-right', () => {
    const r = getBubblePosition(1600, 50, SPRITE, [MON], BUBBLE.w, BUBBLE.h);
    expect(r.tailSide).toBe('top-right');
    expect(r.y).toBeGreaterThan(50 + SPRITE);
  });

  it('creature top-left → bubble below-right, tail top-left', () => {
    const r = getBubblePosition(100, 50, SPRITE, [MON], BUBBLE.w, BUBBLE.h);
    expect(r.tailSide).toBe('top-left');
    expect(r.x).toBeGreaterThan(100);
    expect(r.y).toBeGreaterThan(50 + SPRITE);
  });

  it('clamps bubble so it never leaves monitor bounds', () => {
    // Creature at extreme top-right corner
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
