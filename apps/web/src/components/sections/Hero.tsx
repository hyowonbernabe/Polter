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
  const gy = rect.top  + rect.height / 2;
  const angle = Math.atan2(cy - gy, cx - gx) * (180 / Math.PI);
  const a = ((angle + 360) % 360);
  if (a >= 337.5 || a < 22.5)  return 'right';
  if (a < 67.5)                return 'front-right';
  if (a < 112.5)               return 'front';
  if (a < 157.5)               return 'front-left';
  if (a < 202.5)               return 'left';
  if (a < 247.5)               return 'back-left';
  if (a < 292.5)               return 'back';
  return 'back-right';
}

export function Hero() {
  const [driftY, setDriftY]   = useState(0);
  const [sprite, setSprite]   = useState('front.png');
  const ghostRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);

  // 4s sine float
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      setDriftY(Math.sin(((now - start) / 1000) * (Math.PI * 2) / 4) * 8);
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
      className="relative overflow-hidden min-h-[100dvh]"
      style={{ background: 'var(--bg-0)' }}
    >
      {/* Warm vignette upper-right */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 72% 28%, rgba(212,184,122,0.06), transparent 55%)' }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 pt-8 max-w-[1120px] mx-auto">
        <div className="flex items-center gap-3">
          <GhostSprite name="front.png" scale={1} />
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--fg-1)' }}>
            polter
          </span>
        </div>
        <div className="flex gap-7">
          {[
            { label: 'about',   href: '#about'   },
            { label: 'privacy', href: '#privacy' },
            { label: 'github',  href: 'https://github.com/polter-app/polter' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              className="eyebrow hover:opacity-70"
              style={{ color: 'var(--fg-2)', textDecoration: 'none' }}
              {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {link.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Main grid 60/40 */}
      <div
        className="relative z-10 max-w-[1120px] mx-auto px-8 pt-20 pb-24"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr)',
          gap: 'var(--sp-8)',
          alignItems: 'center',
        }}
      >
        {/* Left: text */}
        <div>
          <div className="eyebrow mb-5" style={{ color: 'var(--fg-3)', letterSpacing: '0.18em' }}>
            a quiet desktop companion
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(48px, 6.5vw, 80px)',
              lineHeight: 0.98,
              letterSpacing: '-0.03em',
              color: 'var(--ghost)',
              textTransform: 'lowercase',
              margin: '0 0 24px',
            }}
          >
            something is watching you work.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 18,
              lineHeight: 1.6,
              color: 'var(--fg-2)',
              maxWidth: 520,
              margin: '0 0 36px',
            }}
          >
            polter is a small pixel ghost that floats on your desktop. it watches how you
            work — never what you type — and occasionally tells you something true about yourself.
          </p>
          <div className="flex items-center gap-3 flex-wrap mb-8">
            <a
              href="https://github.com/polter-app/polter"
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'var(--accent)',
                color: '#1a1612',
                fontFamily: 'var(--font-ui)',
                fontSize: 14,
                fontWeight: 500,
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
              }}
            >
              View on GitHub
            </a>
            <a
              href="#about"
              className="eyebrow"
              style={{ color: 'var(--fg-2)', textDecoration: 'none', padding: '12px 16px' }}
            >
              read more below →
            </a>
          </div>
          <div className="eyebrow" style={{ color: 'var(--fg-3)', letterSpacing: '0.06em' }}>
            windows · open source · everything stays on your machine
          </div>
        </div>

        {/* Right: desk scene placeholder + drifting ghost */}
        <div className="flex items-center justify-center">
          <div
            style={{
              width: '100%',
              aspectRatio: '16/10',
              background: 'var(--bg-2)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Placeholder image */}
            <img
              src="https://placehold.co/800x500"
              alt="desk / screenshot placeholder"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              ref={ghostRef}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, calc(-50% + ${driftY}px))`,
                filter: 'drop-shadow(0 0 20px rgba(245,244,239,0.2))',
              }}
            >
              <GhostSprite name={sprite} scale={2} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hero-main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
