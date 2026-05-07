import type { CreaturePlatform, WispState, Insight, WorkArea } from './platform';

const POSITION_KEY = 'polter_web_pos';

const DEMO_MOODS: WispState[] = ['focus', 'calm', 'spark', 'fade', 'rest', 'calm', 'focus'];

const INSIGHT_POOL: string[] = [
  'three context switches in the last ten minutes. your usual is one.',
  'your typing has settled. forty-one keystrokes a minute, steady.',
  "you've come back to this file four times today.",
  "the cursor hasn't moved in eleven minutes. you're either reading or away.",
  'your typing slowed around 4pm. it usually does.',
  "you've been still for a while. that's unusual for a tuesday.",
];

interface PlatformInstance extends CreaturePlatform {
  _destroy(): void;
}

export function createWebPlatform(): PlatformInstance {
  let moodCallbacks:    ((mood: WispState) => void)[] = [];
  let insightCallbacks: ((insight: Insight) => void)[] = [];
  let moodIndex    = 0;
  let insightIndex = 0;

  const moodTimer    = setInterval(() => {
    moodIndex = (moodIndex + 1) % DEMO_MOODS.length;
    moodCallbacks.forEach(cb => cb(DEMO_MOODS[moodIndex]));
  }, 12_000);

  const insightTimer = setInterval(() => {
    insightIndex = (insightIndex + 1) % INSIGHT_POOL.length;
    insightCallbacks.forEach(cb => cb({ text: INSIGHT_POOL[insightIndex] }));
  }, 30_000);

  return {
    getWorkArea(): WorkArea {
      if (typeof window === 'undefined') return { x: 0, y: 0, width: 1280, height: 800 };
      return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    },

    savePosition(pct: { x: number; y: number }): void {
      if (typeof window === 'undefined') return;
      try { localStorage.setItem(POSITION_KEY, JSON.stringify(pct)); } catch { /* quota */ }
    },

    loadPosition(): { x: number; y: number } | null {
      if (typeof window === 'undefined') return null;
      try {
        const raw = localStorage.getItem(POSITION_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as unknown;
        if (
          typeof p === 'object' && p !== null &&
          typeof (p as Record<string, unknown>).x === 'number' &&
          typeof (p as Record<string, unknown>).y === 'number'
        ) {
          return p as { x: number; y: number };
        }
        return null;
      } catch { return null; }
    },

    onMoodChange(callback: (mood: WispState) => void): () => void {
      moodCallbacks.push(callback);
      return () => { moodCallbacks = moodCallbacks.filter(c => c !== callback); };
    },

    onInsightReady(callback: (insight: Insight) => void): () => void {
      insightCallbacks.push(callback);
      return () => { insightCallbacks = insightCallbacks.filter(c => c !== callback); };
    },

    _destroy(): void {
      clearInterval(moodTimer);
      clearInterval(insightTimer);
    },
  };
}
