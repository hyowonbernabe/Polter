'use client';
import { useEffect, useRef, useState } from 'react';
import { GhostSprite }  from '@/components/ui/GhostSprite';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function DownloadCTA() {
  const [driftY, setDriftY] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      setDriftY(Math.sin(((now - start) / 1000) * (Math.PI * 2) / 4) * 8);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <section
      style={{
        background:     'var(--bg-0)',
        padding:        'var(--sp-9) 24px',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        textAlign:      'center',
        minHeight:      '60dvh',
        justifyContent: 'center',
        position:       'relative',
      }}
    >
      {/* Candlelight vignette behind ghost */}
      <div
        aria-hidden="true"
        style={{
          position:       'absolute',
          inset:          0,
          background:     'radial-gradient(ellipse at 50% 50%, rgba(212,184,122,0.08), transparent 55%)',
          pointerEvents:  'none',
        }}
      />

      <ScrollReveal>
        <div
          style={{
            transform:     `translateY(${driftY}px)`,
            filter:        'drop-shadow(0 0 24px rgba(245,244,239,0.18))',
            marginBottom:  'var(--sp-6)',
          }}
        >
          <GhostSprite name="front.png" scale={4} opacity={0.8} />
        </div>
      </ScrollReveal>

      <ScrollReveal delay={300}>
        <h2
          style={{
            fontFamily:    'var(--font-serif)',
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(28px, 4vw, 48px)',
            lineHeight:    1.1,
            letterSpacing: '-0.02em',
            color:         'var(--fg-1)',
            margin:        '0 0 var(--sp-6)',
          }}
        >
          Let something notice.
        </h2>
      </ScrollReveal>

      <ScrollReveal delay={500}>
        <a
          href="https://github.com/polter-app/polter"
          target="_blank"
          rel="noreferrer"
          style={{
            background:     'var(--accent)',
            color:          '#1a1612',
            fontFamily:     'var(--font-ui)',
            fontSize:       15,
            fontWeight:     500,
            padding:        '14px 28px',
            borderRadius:   'var(--radius-md)',
            textDecoration: 'none',
            display:        'inline-block',
            marginBottom:   'var(--sp-4)',
          }}
        >
          View on GitHub
        </a>
        <div className="eyebrow" style={{ color: 'var(--fg-3)', marginTop: 'var(--sp-3)' }}>
          Open source · MIT licensed · Windows
        </div>
      </ScrollReveal>
    </section>
  );
}
