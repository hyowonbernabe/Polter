import { describe, it, expect } from 'vitest';
import { velocityToDirectionKey } from './useCreatureAnimation';

describe('velocityToDirectionKey', () => {
  it('rightward maps to right', () => {
    expect(velocityToDirectionKey(100, 0)).toEqual({ key: 'right', flip: false });
  });

  it('leftward maps to left (dedicated sprite, no flip)', () => {
    expect(velocityToDirectionKey(-100, 0)).toEqual({ key: 'left', flip: false });
  });

  it('vertical movement maps to front', () => {
    expect(velocityToDirectionKey(0, 200)).toEqual({ key: 'front', flip: false });
  });

  it('slow/zero velocity maps to front', () => {
    expect(velocityToDirectionKey(2, 1)).toEqual({ key: 'front', flip: false });
  });

  it('mostly-right diagonal (>65% horizontal) maps to right', () => {
    // vx=100, vy=50 → speed=111.8, ratio=0.894 ≥ 0.65
    expect(velocityToDirectionKey(100, 50)).toEqual({ key: 'right', flip: false });
  });

  it('slight-right diagonal (<65% horizontal) maps to front-right', () => {
    // vx=50, vy=100 → speed=111.8, ratio=0.447 < 0.65
    expect(velocityToDirectionKey(50, 100)).toEqual({ key: 'front-right', flip: false });
  });

  it('mostly-left diagonal (>65% horizontal) maps to left', () => {
    // vx=-100, vy=50 → speed=111.8, ratio=0.894 ≥ 0.65
    expect(velocityToDirectionKey(-100, 50)).toEqual({ key: 'left', flip: false });
  });

  it('slight-left diagonal (<65% horizontal) maps to front-left', () => {
    // vx=-50, vy=100 → speed=111.8, ratio=0.447 < 0.65
    expect(velocityToDirectionKey(-50, 100)).toEqual({ key: 'front-left', flip: false });
  });
});
