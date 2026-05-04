import { useCallback, useRef, useState } from 'react';
import type { InsightPayload } from '../App';

const STALE_MS = 30 * 60 * 1000;

interface QueuedInsight extends InsightPayload {
  receivedAt: number;
}

interface QueueState {
  current: QueuedInsight | null;
  isFirstEver: boolean;
  enqueue: (insight: InsightPayload & { receivedAt?: number }) => void;
  dismiss: () => void;
}

export function useInsightQueue(): QueueState {
  const [current, setCurrent] = useState<QueuedInsight | null>(null);
  const [isFirstEver, setIsFirstEver] = useState(false);
  const queue = useRef<QueuedInsight[]>([]);
  const hasShownFirst = useRef(false);
  // Mirror of `current` as a ref so dismiss/enqueue can read it synchronously
  const isShowing = useRef(false);

  const showInsight = useCallback((insight: QueuedInsight) => {
    isShowing.current = true;
    const isFirst = !hasShownFirst.current;
    if (isFirst) hasShownFirst.current = true;
    setIsFirstEver(isFirst);
    setCurrent(insight);
  }, []);

  const enqueue = useCallback((insight: InsightPayload & { receivedAt?: number }) => {
    const queued: QueuedInsight = { ...insight, receivedAt: insight.receivedAt ?? Date.now() };
    const age = Date.now() - queued.receivedAt;
    if (age >= STALE_MS) return; // stale before even entering queue

    if (!isShowing.current) {
      showInsight(queued);
    } else {
      queue.current.push(queued);
    }
  }, [showInsight]);

  const dismiss = useCallback(() => {
    isShowing.current = false;
    // Advance to next non-stale item, or clear
    while (queue.current.length > 0) {
      const next = queue.current.shift()!;
      const age = Date.now() - next.receivedAt;
      if (age < STALE_MS) {
        showInsight(next);
        return;
      }
    }
    setCurrent(null);
  }, [showInsight]);

  return { current, isFirstEver, enqueue, dismiss };
}
