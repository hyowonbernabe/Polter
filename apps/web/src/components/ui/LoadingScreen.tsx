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

  // Fluid ring size
  const ringSize = 'clamp(80px, 12vw, 120px)';
  const ghostSize = 'clamp(32px, 5vw, 48px)';

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
        gap:            'clamp(16px, 3vw, 24px)',
        opacity:        fading ? 0 : 1,
        transition:     'opacity 0.5s ease',
        pointerEvents:  fading ? 'none' : 'auto',
      }}
    >
      <CandleScatter layout="a" />

      {/* Film grain inside loading screen */}
      <div
        aria-hidden="true"
        style={{
          position:         'absolute',
          top:              0,
          left:             0,
          width:            '300%',
          height:           '300%',
          pointerEvents:    'none',
          opacity:          0.08,
          backgroundImage:  'url(/assets/noise-grain.bmp)',
          backgroundRepeat: 'repeat',
          animation:        'grainJitter 1.2s steps(8) infinite',
        }}
      />

      {/* Spinner ring + creature */}
      <div style={{ position: 'relative', width: ringSize, height: ringSize }}>
        <svg
          width="100%"
          height="100%"
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
          alt=""
          className="pixel-art"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: ghostSize,
            height: ghostSize,
          }}
        />
      </div>

      <span
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      'clamp(9px, 0.6rem + 0.1vw, 11px)',
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
