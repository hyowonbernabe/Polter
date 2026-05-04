import { describe, it, expect } from 'vitest';
import { ALL_STATES, SPRITE_CONFIG, STATE_GLOW } from './spriteConfig';

describe('spriteConfig', () => {
  it('defines all 7 states', () => {
    expect(ALL_STATES).toHaveLength(7);
  });

  it('every state has a SpriteConfig with non-empty file', () => {
    for (const state of ALL_STATES) {
      const config = SPRITE_CONFIG[state];
      expect(config).toBeDefined();
      expect(config.file).toBeTruthy();
      expect(config.file.endsWith('.png')).toBe(true);
      expect(config.width).toBe(16);
      expect(config.height).toBe(32);
      expect(config.frames).toBeGreaterThanOrEqual(1);
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
