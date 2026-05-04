import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

const IDLE_THRESHOLD = 5;
const MAX_IDLE_COUNT = 10;

export function useIdleDetection(idleFloor = 0.35): number {
  const [idleCount, setIdleCount] = useState(0);

  useEffect(() => {
    const unlisten = listen<{ has_activity: boolean }>('activity_pulse', (event) => {
      if (event.payload.has_activity) {
        setIdleCount(0);
      } else {
        setIdleCount((c) => Math.min(c + 1, MAX_IDLE_COUNT));
      }
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  return idleCount >= IDLE_THRESHOLD ? idleFloor : 1.0;
}
