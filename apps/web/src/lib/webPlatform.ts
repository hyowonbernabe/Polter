import type { CreaturePlatform, WispState, Insight, WorkArea } from './platform';

const POSITION_KEY = 'polter_web_pos';

const DEMO_MOODS: WispState[] = ['focus', 'calm', 'spark', 'fade', 'rest', 'calm', 'focus'];

const INSIGHT_POOL: string[] = [
  "it's nice here. quiet.",
  'i like floating around this page.',
  'are you reading or just scrolling?',
  "don't mind me. just drifting.",
  'i wonder what the other sections look like from up here.',
  "this is my favorite corner. don't tell the others.",
  'you can drag me around if you want. i don\'t mind.',
  'boo.',
  'i think that candle is looking at me.',
  "i've been floating for a while now. no complaints.",
  "try throwing me. i'll come back.",
  'if you install me, i\'ll actually pay attention to you.',
  'just a ghost. doing ghost things.',
  "i'm not haunting. i'm observing. big difference.",
  'the real me lives on your desktop. this is just a visit.',
  "i wonder if anyone reads these.",
  'i was going to say something but i forgot.',
  "still here. still floating. still watching.",
  "you scrolled past me. rude.",
  "pixel art is underrated.",
  "i saw you hover over that button.",
  "i promise i'm friendly.",
  "sometimes i just like sitting here.",
  "this website is my aquarium.",
];

interface PlatformInstance extends CreaturePlatform {
  _destroy(): void;
}

export function createWebPlatform(): PlatformInstance {
  let moodCallbacks:    ((mood: WispState) => void)[] = [];
  let insightCallbacks: ((insight: Insight) => void)[] = [];
  let moodIndex    = 0;
  let usedIndices: number[] = [];

  const moodTimer = setInterval(() => {
    moodIndex = (moodIndex + 1) % DEMO_MOODS.length;
    moodCallbacks.forEach(cb => cb(DEMO_MOODS[moodIndex]));
  }, 12_000);

  // Pick random insight without repeating until all used
  function pickInsight(): string {
    if (usedIndices.length >= INSIGHT_POOL.length) usedIndices = [];
    let idx: number;
    do {
      idx = Math.floor(Math.random() * INSIGHT_POOL.length);
    } while (usedIndices.includes(idx));
    usedIndices.push(idx);
    return INSIGHT_POOL[idx];
  }

  // Random talk every ~30s, bubble auto-dismisses after 5s
  let insightTimer: ReturnType<typeof setTimeout>;

  function scheduleInsight(ms = 30_000) {
    insightTimer = setTimeout(() => {
      insightCallbacks.forEach(cb => cb({ text: pickInsight() }));
      scheduleInsight();
    }, ms);
  }

  // First one after 10s so the page has time to settle
  scheduleInsight(10_000);

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
      clearTimeout(insightTimer);
    },
  };
}
