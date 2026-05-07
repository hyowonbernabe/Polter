'use client';
import { useEffect, useState } from 'react';
import { GhostSprite } from '@/components/ui/GhostSprite';

const SPIN_SPRITES = [
  'front.png',
  'front-right.png',
  'right.png',
  'back-right.png',
  'back.png',
  'back-left.png',
  'left.png',
  'front-left.png',
];

export default function Loading() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame(prev => (prev + 1) % SPIN_SPRITES.length);
    }, 200);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        minHeight:      '100dvh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        background:     'var(--bg-0)',
        gap:            24,
      }}
    >
      {/* Spinning ghost */}
      <div className="loading-spin">
        <GhostSprite name={SPIN_SPRITES[frame]} scale={3} />
      </div>

      {/* Subtle text */}
      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         'var(--fg-3)',
        }}
      >
        Loading
      </span>
    </div>
  );
}
