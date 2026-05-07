'use client';
import { useEffect, useRef, useState } from 'react';
import { GhostSprite }  from '@/components/ui/GhostSprite';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { CandleScatter } from '@/components/ui/CandleScatter';
import { useContainerSize } from '@/hooks/useContainerSize';

/* ── Direction mapping (same as Hero) ── */

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

/* ── Component ── */

export function DownloadCTA() {
  const [driftY, setDriftY] = useState(0);
  const [sprite, setSprite] = useState('front.png');
  const ghostRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);
  const { ref: sectionRef, width: sw, height: sh } = useContainerSize();

  // Fluid ghost scale: 3 at 320px → 8 at 1200px+
  const ghostScale = Math.max(3, Math.min(8, Math.floor(Math.min(sw, sh) / 120))) as 1 | 2 | 3 | 4 | 8;

  // Sine float
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      setDriftY(Math.sin(((now - start) / 1000) * (Math.PI * 2) / 4) * 12);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Cursor + touch tracking
  useEffect(() => {
    const onMove = (cx: number, cy: number) => {
      if (!ghostRef.current) return;
      setSprite(DIR_SPRITES[getCursorDirection(ghostRef.current, cx, cy)]);
    };
    const onMouse = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        background:     'var(--bg-0)',
        minHeight:      '100dvh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        textAlign:      'center',
        position:       'relative',
        overflow:       'hidden',
        padding:        'var(--section-py) var(--section-px)',
      }}
    >
      <CandleScatter layout="d" />
      {/* Warm vignette */}
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:         0,
          background:    'radial-gradient(ellipse at 50% 45%, rgba(212,184,122,0.06), transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      {/* Ghost — massive, cursor-tracking */}
      <ScrollReveal>
        <div
          ref={ghostRef}
          style={{
            transform:     `translateY(${driftY}px)`,
            filter:        'drop-shadow(0 0 20px rgba(245,244,239,0.10))',
            marginBottom:  'var(--sp-7)',
            position:      'relative',
            zIndex:        1,
          }}
        >
          <GhostSprite name={sprite} scale={ghostScale} />
        </div>
      </ScrollReveal>

      {/* Headline */}
      <ScrollReveal delay={200}>
        <h2
          style={{
            fontFamily:    'var(--font-serif)',
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(32px, 5vw, 80px)',
            lineHeight:    1.05,
            letterSpacing: '-0.03em',
            color:         'var(--fg-1)',
            margin:        '0 0 var(--sp-5)',
            maxWidth:      700,
            position:      'relative',
            zIndex:        1,
          }}
        >
          Let something notice.
        </h2>
      </ScrollReveal>

      <ScrollReveal delay={300}>
        <p
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize:   'clamp(14px, 0.85rem + 0.3vw, 20px)',
            lineHeight: 1.6,
            color:      'var(--fg-2)',
            maxWidth:   460,
            margin:     '0 0 var(--sp-8)',
            position:   'relative',
            zIndex:     1,
          }}
        >
          A small ghost that watches how you work and tells you what it sees.
          Free to use. Source available. Everything stays on your machine.
        </p>
      </ScrollReveal>

      {/* CTA button */}
      <ScrollReveal delay={400}>
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            'var(--sp-4)',
            flexWrap:       'wrap',
            justifyContent: 'center',
            marginBottom:   'var(--sp-6)',
            position:       'relative',
            zIndex:         1,
          }}
        >
          <a
            href="https://github.com/hyowonbernabe/Polter"
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{
              background:     'var(--accent)',
              color:          '#1a1612',
              fontFamily:     'var(--font-ui)',
              fontSize:       'clamp(15px, 0.9rem + 0.2vw, 17px)',
              fontWeight:     600,
              padding:        'clamp(14px, 2vw, 18px) clamp(24px, 4vw, 36px)',
              borderRadius:   'var(--radius-md)',
              textDecoration: 'none',
              display:        'inline-block',
            }}
          >
            View on GitHub
          </a>
        </div>
      </ScrollReveal>

    </section>
  );
}
