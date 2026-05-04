export type WispState = 'focus' | 'calm' | 'deep' | 'spark' | 'burn' | 'fade' | 'rest';

export const ALL_STATES: WispState[] = ['focus', 'calm', 'deep', 'spark', 'burn', 'fade', 'rest'];

export interface SpriteConfig {
  file: string;   // path relative to /src/assets/sprites/
  frames: number; // number of horizontal frames in the sprite sheet
  width: number;  // width of one frame in native pixels
  height: number; // height of one frame in native pixels
}

export const SPRITE_CONFIG: Record<WispState, SpriteConfig> = {
  focus: { file: 'wisp.png', frames: 1, width: 64, height: 64 },
  calm:  { file: 'wisp.png', frames: 1, width: 64, height: 64 },
  deep:  { file: 'wisp.png', frames: 1, width: 64, height: 64 },
  spark: { file: 'wisp.png', frames: 1, width: 64, height: 64 },
  burn:  { file: 'wisp.png', frames: 1, width: 64, height: 64 },
  fade:  { file: 'wisp.png', frames: 1, width: 64, height: 64 },
  rest:  { file: 'wisp.png', frames: 1, width: 64, height: 64 },
};

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
