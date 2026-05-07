'use client';
import { useEffect, useRef, useState } from 'react';
import { GhostSprite } from '@/components/ui/GhostSprite';

const DIR_SPRITES: Record<string, string> = {
  'front':       'front.png',
  'front-right': 'front-right.png',
  'right':       'right.png',
  'back-right':  'back-right.png',
  'back':        'back.png',
  'back-left':   'back-left.png',
  'left':        'left.png',
  'front-left':  'front-left.png',
};

function getCursorDirection(ghostEl: HTMLElement, cx: number, cy: number): string {
  const rect = ghostEl.getBoundingClientRect();
  const gx = rect.left + rect.width / 2;
  const gy = rect.top + rect.height / 2;
  const angle = Math.atan2(cy - gy, cx - gx) * (180 / Math.PI);
  const a = (angle + 360) % 360;
  if (a >= 337.5 || a < 22.5) return 'right';
  if (a < 67.5) return 'front-right';
  if (a < 112.5) return 'front';
  if (a < 157.5) return 'front-left';
  if (a < 202.5) return 'left';
  if (a < 247.5) return 'back-left';
  if (a < 292.5) return 'back';
  return 'back-right';
}

export function Hero() {
  const [driftY, setDriftY] = useState(0);
  const [sprite, setSprite] = useState('front.png');
  const ghostRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // 4s sine float
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      setDriftY(Math.sin(((now - start) / 1000) * (Math.PI * 2) / 4) * 10);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Cursor-driven direction sprite
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!ghostRef.current) return;
      setSprite(DIR_SPRITES[getCursorDirection(ghostRef.current, e.clientX, e.clientY)]);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <section
      className="relative overflow-hidden"
      style={{
        width: '100%',
        height: '100dvh',
        background: 'var(--bg-0)',
      }}
    >
      {/* Warm vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 70% 30%, rgba(212,184,122,0.08), transparent 60%)',
        }}
      />

      {/* Main 50/50 grid */}
      <div
        className="relative z-10 h-full"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          alignItems: 'center',
          padding: '0 5vw',
          gap: 'var(--sp-8)',
        }}
      >
        {/* Left: text */}
        <div>
          <div
            className="eyebrow"
            style={{
              color: 'var(--fg-3)',
              letterSpacing: '0.18em',
              marginBottom: 20,
            }}
          >
            A quiet desktop companion
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(56px, 8vw, 120px)',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: 'var(--ghost)',
              margin: '0 0 32px',
            }}
          >
            Something is watching you work.
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 20,
              lineHeight: 1.6,
              color: 'var(--fg-2)',
              maxWidth: 540,
              margin: '0 0 40px',
            }}
          >
            A small pixel ghost that lives on your screen. It watches how you
            work, not what you type, and sometimes says what it notices.
          </p>

          <div className="flex items-center gap-4 flex-wrap" style={{ marginBottom: 32 }}>
            <a
              href="https://github.com/polter-app/polter"
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'var(--accent)',
                color: '#1a1612',
                fontFamily: 'var(--font-ui)',
                fontSize: 15,
                fontWeight: 500,
                padding: '14px 28px',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
              }}
            >
              View on GitHub
            </a>
            <a
              href="#about"
              className="eyebrow"
              style={{
                color: 'var(--fg-2)',
                textDecoration: 'none',
                padding: '14px 16px',
              }}
            >
              Read more below →
            </a>
          </div>

          <div
            className="eyebrow"
            style={{ color: 'var(--fg-3)', letterSpacing: '0.06em' }}
          >
            Windows · Open source · Everything stays on your machine
          </div>
        </div>

        {/* Right: visual */}
        <div className="flex items-center justify-center h-full" style={{ padding: '5vh 0' }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              maxHeight: '70vh',
              background: 'var(--bg-2)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <img
              src="https://placehold.co/1200x800"
              alt="desk / screenshot placeholder"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <div
              ref={ghostRef}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, calc(-50% + ${driftY}px))`,
                filter: 'drop-shadow(0 0 28px rgba(245,244,239,0.25))',
              }}
            >
              <GhostSprite name={sprite} scale={4} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile responsive override */}
      <style>{`
        @media (max-width: 768px) {
          section > .z-10 {
            grid-template-columns: 1fr !important;
            padding: 100px var(--sp-5) var(--sp-7) !important;
            height: auto !important;
          }
          section {
            height: auto !important;
            min-height: 100dvh;
          }
          section > .z-10 > div:last-child {
            aspect-ratio: 16 / 10;
            height: auto !important;
            max-height: none !important;
          }
        }
      `}</style>
    </section>
  );
}
