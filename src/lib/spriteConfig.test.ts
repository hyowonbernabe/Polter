import { describe, it, expect } from 'vitest';
import { ALL_STATES, MOOD_SPRITE, FUN_SPRITES, STATE_GLOW } from './spriteConfig';

describe('spriteConfig', () => {
  it('defines all 7 states', () => {
    expect(ALL_STATES).toHaveLength(7);
  });

  it('every state has a mood sprite pointing to a png', () => {
    for (const state of ALL_STATES) {
      const file = MOOD_SPRITE[state];
      expect(file).toBeTruthy();
      expect(file.endsWith('.png')).toBe(true);
    }
  });

  it('fun sprites are non-empty and all point to pngs', () => {
    expect(FUN_SPRITES.length).toBeGreaterThan(0);
    for (const file of FUN_SPRITES) {
      expect(file.endsWith('.png')).toBe(true);
    }
  });

  it('every state has a glow entry', () => {
    for (const state of ALL_STATES) {
      expect(STATE_GLOW[state]).toBeDefined();
    }
  });

  it('cold_start has a glow entry', () => {
    expect(STATE_GLOW.cold_start).toBeDefined();
    expect(STATE_GLOW.cold_start).toContain('drop-shadow');
  });
});
