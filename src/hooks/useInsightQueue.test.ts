// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInsightQueue } from './useInsightQueue';
import type { InsightPayload } from '../App';

function makeInsight(type = 'flow_detection', overrideTs?: number): InsightPayload & { receivedAt: number } {
  return {
    state: 'focus', insight: 'something noticed.', extended: 'more detail.',
    type, is_first_ever: false, receivedAt: overrideTs ?? Date.now(),
  };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('useInsightQueue', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useInsightQueue());
    expect(result.current.current).toBeNull();
  });

  it('enqueue makes insight current when queue is empty', () => {
    const { result } = renderHook(() => useInsightQueue());
    act(() => { result.current.enqueue(makeInsight()); });
    expect(result.current.current).not.toBeNull();
  });

  it('dismiss clears current', () => {
    const { result } = renderHook(() => useInsightQueue());
    act(() => { result.current.enqueue(makeInsight()); });
    act(() => { result.current.dismiss(); });
    expect(result.current.current).toBeNull();
  });

  it('second insight queues and becomes current after dismiss', () => {
    const { result } = renderHook(() => useInsightQueue());
    act(() => {
      result.current.enqueue(makeInsight('flow_detection'));
      result.current.enqueue(makeInsight('fatigue_signal'));
    });
    expect(result.current.current?.type).toBe('flow_detection');
    act(() => { result.current.dismiss(); });
    expect(result.current.current?.type).toBe('fatigue_signal');
  });

  it('discards stale insights older than 30 minutes', () => {
    const { result } = renderHook(() => useInsightQueue());
    const staleTs = Date.now() - 31 * 60 * 1000;
    act(() => { result.current.enqueue(makeInsight('anomaly', staleTs)); });
    expect(result.current.current).toBeNull();
  });

  it('first-ever flag is true for the very first insight shown', () => {
    const { result } = renderHook(() => useInsightQueue());
    act(() => { result.current.enqueue(makeInsight()); });
    expect(result.current.isFirstEver).toBe(true);
  });

  it('first-ever flag is false after the first insight is dismissed', () => {
    const { result } = renderHook(() => useInsightQueue());
    act(() => { result.current.enqueue(makeInsight()); });
    act(() => { result.current.dismiss(); });
    act(() => { result.current.enqueue(makeInsight()); });
    expect(result.current.isFirstEver).toBe(false);
  });
});
