'use client';
import { useEffect, useState } from 'react';
import { CandleScatter } from './CandleScatter';

const SPIN_SPRITES = [
  '/sprites/front.png',
  '/sprites/front-right.png',
  '/sprites/right.png',
  '/sprites/back-right.png',
  '/sprites/back.png',
  '/sprites/back-left.png',
  '/sprites/left.png',
  '/sprites/front-left.png',
];

export function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [frame, setFrame] = useState(0);

  // Cycle sprite frames
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setFrame(prev => (prev + 1) % SPIN_SPRITES.length);
    }, 150);
    return () => clearInterval(id);
  }, [visible]);

  // Wait for page to finish loading, then fade out
  useEffect(() => {
    function hide() {
      // Small delay so it doesn't flash
      setTimeout(() => {
        setFading(true);
        setTimeout(() => setVisible(false), 500);
      }, 400);
    }

    if (document.readyState === 'complete') {
      hide();
    } else {
      window.addEventListener('load', hide);
      return () => window.removeEventListener('load', hide);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         99999,
        background:     'var(--bg-0)',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            24,
        opacity:        fading ? 0 : 1,
        transition:     'opacity 0.5s ease',
        pointerEvents:  fading ? 'none' : 'auto',
      }}
    >
      <CandleScatter layout="a" />

      {/* Spinner ring + creature */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        {/* SVG spinner ring */}
        <svg
          width={120}
          height={120}
          viewBox="0 0 120 120"
          style={{
            position: 'absolute',
            inset: 0,
            animation: 'loading-spin 1.8s linear infinite',
          }}
        >
          <circle
            cx={60}
            cy={60}
            r={52}
            fill="none"
            stroke="var(--border-1)"
            strokeWidth={2}
          />
          <circle
            cx={60}
            cy={60}
            r={52}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="82 245"
            strokeLinecap="round"
          />
        </svg>

        {/* Ghost sprite cycling in center */}
        <img
          src={SPIN_SPRITES[frame]}
          width={48}
          height={48}
          alt=""
          className="pixel-art"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

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
