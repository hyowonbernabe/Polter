export type WispState = 'focus' | 'calm' | 'deep' | 'spark' | 'burn' | 'fade' | 'rest';

export interface Insight {
  text: string;
}

export interface WorkArea {
  x:      number;
  y:      number;
  width:  number;
  height: number;
}

export interface CreaturePlatform {
  getWorkArea(): WorkArea;
  savePosition(pct: { x: number; y: number }): void;
  loadPosition(): { x: number; y: number } | null;
  onMoodChange(callback: (mood: WispState) => void): () => void;
  onInsightReady(callback: (insight: Insight) => void): () => void;
}
