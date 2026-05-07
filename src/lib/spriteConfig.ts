export type PolterState = 'focus' | 'calm' | 'deep' | 'spark' | 'burn' | 'fade' | 'rest';

export const ALL_STATES: PolterState[] = ['focus', 'calm', 'deep', 'spark', 'burn', 'fade', 'rest'];

export const MOOD_SPRITE: Record<PolterState, string> = {
  focus: 'focused.png',
  calm:  'calm.png',
  deep:  'quiet.png',
  spark: 'excited.png',
  burn:  'overworked.png',
  fade:  'tired.png',
  rest:  'sleeping.png',
};

export const FUN_SPRITES: string[] = ['reading.png', 'kid.png', 'umbrella.png', 'box.png', 'sleepy.png'];

// Glow colors aligned to Polter mood palette.
export const STATE_GLOW: Record<PolterState | 'cold_start', string> = {
  focus:      'drop-shadow(0 0 8px #7a9e8b)',
  calm:       'drop-shadow(0 0 6px #7a9e8b)',
  deep:       'drop-shadow(0 0 10px #d4b87a)',
  spark:      'drop-shadow(0 0 10px #d4b87a)',
  burn:       'drop-shadow(0 0 8px #c08a64)',
  fade:       'drop-shadow(0 0 5px #8e7fa8)',
  rest:       'none',
  cold_start: 'drop-shadow(0 0 6px #4f5a6e)',
};
