import { describe, it, expect } from 'vitest';
import { getBubblePosition, type MonitorInfo } from './bubblePosition';

const MON: MonitorInfo = { x: 0, y: 0, width: 1920, height: 1080 };
const SW = 64;
const SH = 64;
const BW = 300;
const VH = 1080;

describe('getBubblePosition', () => {
  it('creature in lower half → tailSide bottom', () => {
    const r = getBubblePosition(1600, 800, SW, SH, [MON], BW, VH);
    expect(r.tailSide).toBe('bottom');
  });

  it('creature in upper half → tailSide top', () => {
    const r = getBubblePosition(100, 50, SW, SH, [MON], BW, VH);
    expect(r.tailSide).toBe('top');
  });

  it('tailOffset points at sprite center when bubble is not clamped', () => {
    // cx = 1600 + 32 = 1632; x = 1632 - 150 = 1482; tailOffset = 1632 - 1482 = 150
    const r = getBubblePosition(1600, 800, SW, SH, [MON], BW, VH);
    expect(r.tailOffset).toBe(150);
  });

  it('tailOffset is clamped when bubble hits the right edge', () => {
    // cx = 1868+32=1900; x clamped to 1920-300=1620; tailOffset = min(1900-1620, 300-16) = min(280, 284) = 280
    const r = getBubblePosition(1868, 800, SW, SH, [MON], BW, VH);
    expect(r.tailOffset).toBe(280);
  });

  it('tailOffset is clamped when bubble hits the left edge', () => {
    // Sprite at far left: cx = 0+32=32; x clamped to 0; tailOffset = max(32-0, 16) = 32
    const r = getBubblePosition(0, 800, SW, SH, [MON], BW, VH);
    expect(r.tailOffset).toBe(32);
  });

  it('clamps x so bubble never leaves monitor bounds', () => {
    const r = getBubblePosition(1890, 10, SW, SH, [MON], BW, VH);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + BW).toBeLessThanOrEqual(1920);
  });

  it('falls back when monitor list is empty', () => {
    const r = getBubblePosition(100, 100, SW, SH, [], BW, VH);
    expect(r.x).toBeGreaterThanOrEqual(0);
  });
});
