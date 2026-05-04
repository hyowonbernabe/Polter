import { describe, it, expect } from 'vitest';
import { clamp, normalize, magnitude, lerp, randBetween, clampVec2 } from '../physics';

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('normalize', () => {
  it('returns unit vector for non-zero input', () => {
    const result = normalize({ x: 3, y: 4 });
    expect(result.x).toBeCloseTo(0.6);
    expect(result.y).toBeCloseTo(0.8);
  });
  it('returns zero vector for zero input', () => {
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('magnitude', () => {
  it('returns correct length', () => {
    expect(magnitude({ x: 3, y: 4 })).toBeCloseTo(5);
  });
  it('returns 0 for zero vector', () => {
    expect(magnitude({ x: 0, y: 0 })).toBe(0);
  });
});

describe('lerp', () => {
  it('returns a at t=0', () => {
    expect(lerp(0, 100, 0)).toBe(0);
  });
  it('returns b at t=1', () => {
    expect(lerp(0, 100, 1)).toBe(100);
  });
  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });
  it('clamps t above 1', () => {
    expect(lerp(0, 100, 2)).toBe(100);
  });
});

describe('randBetween', () => {
  it('returns a value within range over many calls', () => {
    for (let i = 0; i < 100; i++) {
      const v = randBetween(10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(20);
    }
  });
});

describe('clampVec2', () => {
  it('passes through vectors within maxMag', () => {
    const v = { x: 3, y: 0 };
    expect(clampVec2(v, 5)).toEqual({ x: 3, y: 0 });
  });
  it('clamps vectors exceeding maxMag to maxMag length', () => {
    const result = clampVec2({ x: 10, y: 0 }, 5);
    expect(magnitude(result)).toBeCloseTo(5);
    expect(result.x).toBeCloseTo(5);
  });
});
