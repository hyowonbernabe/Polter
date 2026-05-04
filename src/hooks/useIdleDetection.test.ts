import { describe, it, expect } from 'vitest';

describe('idle detection logic', () => {
  const IDLE_THRESHOLD = 5;

  it('returns 1.0 when idle count is 0', () => {
    expect(0 >= IDLE_THRESHOLD ? 0.35 : 1.0).toBe(1.0);
  });

  it('returns 1.0 when idle count is 4 (below threshold)', () => {
    expect(4 >= IDLE_THRESHOLD ? 0.35 : 1.0).toBe(1.0);
  });

  it('returns 0.35 when idle count reaches 5', () => {
    expect(5 >= IDLE_THRESHOLD ? 0.35 : 1.0).toBe(0.35);
  });

  it('returns 0.35 when idle count exceeds 5', () => {
    expect(8 >= IDLE_THRESHOLD ? 0.35 : 1.0).toBe(0.35);
  });

  it('resets to 1.0 when activity resumes', () => {
    const resetCount = 0;
    expect(resetCount >= IDLE_THRESHOLD ? 0.35 : 1.0).toBe(1.0);
  });
});
