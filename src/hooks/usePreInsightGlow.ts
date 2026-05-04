import { useEffect, useRef, useState } from 'react';

const PHASE1_NORMAL = 600;
const PHASE1_FIRST = 1500;
const PHASE2_DURATION = 800;

export function usePreInsightGlow(
  triggered: boolean,
  isFirstEver: boolean,
  onReady?: () => void,
): { phase: 0 | 1 | 2 | 3 } {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!triggered) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setPhase(0);
      return;
    }

    setPhase(1);
    const phase1Duration = isFirstEver ? PHASE1_FIRST : PHASE1_NORMAL;

    const t1 = setTimeout(() => {
      setPhase(2);
      const t2 = setTimeout(() => {
        setPhase(3);
        onReady?.();
      }, PHASE2_DURATION);
      timers.current.push(t2);
    }, phase1Duration);

    timers.current.push(t1);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [triggered, isFirstEver, onReady]);

  return { phase };
}
