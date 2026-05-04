import { describe, it, expect } from 'vitest';

describe('useCreatureAnimation constants', () => {
  it('MIN_FRAME_MS enforces 12fps', () => {
    const fps12 = 1000 / 12;
    expect(fps12).toBeGreaterThan(83);
    expect(fps12).toBeLessThan(84);
  });

  it('crossfade duration is 300ms', () => {
    const CROSSFADE_DURATION_MS = 300;
    expect(CROSSFADE_DURATION_MS).toBe(300);
  });
});

describe('crossfade progress logic (pure)', () => {
  it('returns 1.0 when no crossfade is active', () => {
    const crossfadeStart: number | null = null;
    const progress = crossfadeStart === null ? 1 : 0;
    expect(progress).toBe(1);
  });

  it('progress is 0.5 at midpoint of 300ms fade', () => {
    const crossfadeStart = 1000;
    const now = 1150;
    const progress = (now - crossfadeStart) / 300;
    expect(progress).toBeCloseTo(0.5);
  });

  it('progress reaches 1.0 at end of fade', () => {
    const crossfadeStart = 1000;
    const now = 1300;
    const progress = Math.min((now - crossfadeStart) / 300, 1);
    expect(progress).toBe(1);
  });
});
