'use client';
import { Candle } from './Candle';

interface CandlePlacement {
  top?:       string;
  bottom?:    string;
  left?:      string;
  right?:     string;
  size:       number;
  opacity:    number;
  rotation:   number;
  floatPhase: number;
  zIndex:     number;
}

// Back layer: smaller, lower opacity, more centered
// Kept away from top/bottom edges (min 15% from boundaries)
const BACK_LAYOUTS: Record<string, CandlePlacement[]> = {
  a: [
    { top: '25%',    left: '18%',  size: 32,  opacity: 0.15, rotation: -6,   floatPhase: 0,   zIndex: 0 },
    { top: '55%',    right: '22%', size: 28,  opacity: 0.12, rotation: 10,   floatPhase: 1.5, zIndex: 0 },
    { top: '40%',    left: '30%',  size: 24,  opacity: 0.10, rotation: -3,   floatPhase: 2.8, zIndex: 0 },
    { top: '70%',    left: '40%',  size: 26,  opacity: 0.12, rotation: 8,    floatPhase: 3.5, zIndex: 0 },
  ],
  b: [
    { top: '20%',    right: '28%', size: 30,  opacity: 0.14, rotation: 5,    floatPhase: 0.5, zIndex: 0 },
    { top: '60%',    left: '25%',  size: 26,  opacity: 0.10, rotation: -8,   floatPhase: 2.0, zIndex: 0 },
    { top: '40%',    left: '35%',  size: 22,  opacity: 0.08, rotation: 12,   floatPhase: 3.2, zIndex: 0 },
    { top: '75%',    right: '32%', size: 28,  opacity: 0.11, rotation: -4,   floatPhase: 1.0, zIndex: 0 },
  ],
  c: [
    { top: '30%',    right: '20%', size: 28,  opacity: 0.13, rotation: 7,    floatPhase: 1.2, zIndex: 0 },
    { top: '65%',    left: '28%',  size: 24,  opacity: 0.10, rotation: -10,  floatPhase: 2.5, zIndex: 0 },
    { top: '50%',    left: '22%',  size: 26,  opacity: 0.11, rotation: 4,    floatPhase: 0.3, zIndex: 0 },
  ],
  d: [
    { top: '22%',    left: '32%',  size: 30,  opacity: 0.14, rotation: -5,   floatPhase: 0.8, zIndex: 0 },
    { top: '58%',    right: '25%', size: 26,  opacity: 0.11, rotation: 9,    floatPhase: 2.2, zIndex: 0 },
    { top: '45%',    right: '30%', size: 22,  opacity: 0.09, rotation: -7,   floatPhase: 3.0, zIndex: 0 },
    { top: '72%',    left: '38%',  size: 24,  opacity: 0.10, rotation: 6,    floatPhase: 1.5, zIndex: 0 },
  ],
};

// Front layer: bigger, visible, at the edges but not too close to top/bottom
const FRONT_LAYOUTS: Record<string, CandlePlacement[]> = {
  a: [
    { top: '65%',    left: '2%',   size: 72,  opacity: 0.55, rotation: -8,   floatPhase: 0,   zIndex: 20 },
    { top: '18%',    right: '3%',  size: 60,  opacity: 0.45, rotation: 14,   floatPhase: 1.3, zIndex: 20 },
    { top: '45%',    right: '1%',  size: 56,  opacity: 0.40, rotation: -5,   floatPhase: 2.6, zIndex: 20 },
  ],
  b: [
    { top: '18%',    left: '1%',   size: 68,  opacity: 0.50, rotation: 10,   floatPhase: 0.4, zIndex: 20 },
    { top: '70%',    right: '2%',  size: 76,  opacity: 0.55, rotation: -12,  floatPhase: 1.8, zIndex: 20 },
    { top: '42%',    left: '0%',   size: 52,  opacity: 0.35, rotation: 6,    floatPhase: 3.0, zIndex: 20 },
  ],
  c: [
    { top: '60%',    right: '1%',  size: 70,  opacity: 0.50, rotation: -10,  floatPhase: 1.0, zIndex: 20 },
    { top: '20%',    left: '2%',   size: 64,  opacity: 0.45, rotation: 8,    floatPhase: 2.2, zIndex: 20 },
    { top: '40%',    left: '0%',   size: 48,  opacity: 0.35, rotation: -4,   floatPhase: 0.6, zIndex: 20 },
  ],
  d: [
    { top: '18%',    right: '1%',  size: 74,  opacity: 0.55, rotation: -15,  floatPhase: 0.7, zIndex: 20 },
    { top: '68%',    left: '1%',   size: 66,  opacity: 0.50, rotation: 12,   floatPhase: 1.5, zIndex: 20 },
    { top: '40%',    right: '0%',  size: 54,  opacity: 0.40, rotation: -6,   floatPhase: 2.8, zIndex: 20 },
  ],
};

interface CandleScatterProps {
  layout?: 'a' | 'b' | 'c' | 'd';
}

export function CandleScatter({ layout = 'a' }: CandleScatterProps) {
  const back  = BACK_LAYOUTS[layout];
  const front = FRONT_LAYOUTS[layout];

  return (
    <>
      {back.map((p, i) => (
        <Candle
          key={`back-${i}`}
          size={p.size}
          rotation={p.rotation}
          floatPhase={p.floatPhase}
          style={{
            position:      'absolute',
            top:           p.top,
            bottom:        p.bottom,
            left:          p.left,
            right:         p.right,
            opacity:       p.opacity,
            zIndex:        p.zIndex,
            pointerEvents: 'none',
          }}
        />
      ))}
      {front.map((p, i) => (
        <Candle
          key={`front-${i}`}
          size={p.size}
          rotation={p.rotation}
          floatPhase={p.floatPhase}
          style={{
            position:      'absolute',
            top:           p.top,
            bottom:        p.bottom,
            left:          p.left,
            right:         p.right,
            opacity:       p.opacity,
            zIndex:        p.zIndex,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}
