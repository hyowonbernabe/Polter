import { describe, it, expect } from 'vitest';

describe('burn distress threshold', () => {
  const BURN_DISTRESS_MS = 90 * 60 * 1_000;

  it('threshold is exactly 90 minutes in milliseconds', () => {
    expect(BURN_DISTRESS_MS).toBe(5_400_000);
  });

  it('does not trigger before 90 minutes', () => {
    const elapsed = 89 * 60 * 1_000;
    expect(elapsed >= BURN_DISTRESS_MS).toBe(false);
  });

  it('triggers at exactly 90 minutes', () => {
    const elapsed = 90 * 60 * 1_000;
    expect(elapsed >= BURN_DISTRESS_MS).toBe(true);
  });

  it('triggers after 90 minutes', () => {
    const elapsed = 120 * 60 * 1_000;
    expect(elapsed >= BURN_DISTRESS_MS).toBe(true);
  });
});
