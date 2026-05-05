export type WispState = 'focus' | 'calm' | 'deep' | 'spark' | 'burn' | 'fade' | 'rest';

export const ALL_STATES: WispState[] = ['focus', 'calm', 'deep', 'spark', 'burn', 'fade', 'rest'];

export const MOOD_SPRITE: Record<WispState, string> = {
  focus: 'focused.png',
  calm:  'calm.png',
  deep:  'quiet.png',
  spark: 'excited.png',
  burn:  'overworked.png',
  fade:  'tired.png',
  rest:  'sleeping.png',
};

export const FUN_SPRITES: string[] = ['reading.png', 'kid.png', 'umbrella.png', 'box.png', 'sleepy.png'];

export const STATE_GLOW: Record<WispState | 'cold_start', string> = {
  focus:      'drop-shadow(0 0 8px #6ba3d6)',
  calm:       'drop-shadow(0 0 6px #6ba3d6)',
  deep:       'drop-shadow(0 0 10px #6ba3d6)',
  spark:      'drop-shadow(0 0 10px #f4a347)',
  burn:       'drop-shadow(0 0 8px #cc4400)',
  fade:       'drop-shadow(0 0 5px #8e7fa8)',
  rest:       'none',
  cold_start: 'drop-shadow(0 0 6px #b0b0c8)',
};
