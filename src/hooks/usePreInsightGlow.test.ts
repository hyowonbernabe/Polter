// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePreInsightGlow } from './usePreInsightGlow';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('usePreInsightGlow', () => {
  it('starts at phase 0 when not triggered', () => {
    const { result } = renderHook(() =>
      usePreInsightGlow(false, false)
    );
    expect(result.current.phase).toBe(0);
  });

  it('sequences 0→1→2→3 for normal insight', () => {
    const onReady = vi.fn();
    const { result } = renderHook(() =>
      usePreInsightGlow(true, false, onReady)
    );
    expect(result.current.phase).toBe(1);

    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.phase).toBe(2);

    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current.phase).toBe(3);

    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('phase 1 lasts 1500ms for first-ever insight', () => {
    const { result } = renderHook(() =>
      usePreInsightGlow(true, true)
    );
    expect(result.current.phase).toBe(1);

    // After 600ms still in phase 1 (normal would have moved to 2)
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.phase).toBe(1);

    // After 1500ms total → phase 2
    act(() => { vi.advanceTimersByTime(900); });
    expect(result.current.phase).toBe(2);
  });

  it('resets to 0 when triggered becomes false', () => {
    const { result, rerender } = renderHook(
      ({ triggered }: { triggered: boolean }) => usePreInsightGlow(triggered, false),
      { initialProps: { triggered: true } }
    );
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.phase).toBe(2);

    rerender({ triggered: false });
    expect(result.current.phase).toBe(0);
  });
});
