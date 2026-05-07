'use client';
import { useEffect, useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { CandleScatter } from '@/components/ui/CandleScatter';
import { GhostSprite } from '@/components/ui/GhostSprite';

/* ── SVG Icons ── */

function CpuIcon({ size = 48, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="15" x2="23" y2="15" />
      <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="15" x2="4" y2="15" />
    </svg>
  );
}

function MemoryIcon({ size = 48, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="6" y1="10" x2="6" y2="14" />
      <line x1="10" y1="10" x2="10" y2="14" />
      <line x1="14" y1="10" x2="14" y2="14" />
      <line x1="18" y1="10" x2="18" y2="14" />
      <line x1="6" y1="6" x2="6" y2="4" />
      <line x1="10" y1="6" x2="10" y2="4" />
      <line x1="14" y1="6" x2="14" y2="4" />
      <line x1="18" y1="6" x2="18" y2="4" />
    </svg>
  );
}

/* ── Animated counter ── */

function AnimatedNumber({ target, prefix = '', suffix = '', delay = 0 }: { target: number; prefix?: string; suffix?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal();
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!isVisible || started) return;
    const timeout = setTimeout(() => {
      setStarted(true);
      const duration = 1400;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [isVisible, started, target, delay]);

  return (
    <span ref={ref as React.Ref<HTMLSpanElement>}>
      {prefix}{started ? value : 0}{suffix}
    </span>
  );
}

/* ── Component ── */

export function Lightweight() {
  return (
    <section
      style={{
        background:     'var(--bg-0)',
        minHeight:      '100dvh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        position:       'relative',
        overflow:       'hidden',
        padding:        'var(--sp-9) clamp(24px, 6vw, 80px)',
      }}
    >
      <CandleScatter layout="b" />
      {/* Floating ghost decoration */}
      <div
        style={{
          position:      'absolute',
          top:           '10%',
          right:         '5%',
          opacity:       0.05,
          pointerEvents: 'none',
        }}
      >
        <GhostSprite name="calm.png" scale={8} />
      </div>

      {/* Header */}
      <ScrollReveal>
        <div className="eyebrow mb-4" style={{ color: 'var(--fg-3)', textAlign: 'center' }}>
          Lightweight
        </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <h2
          style={{
            fontFamily:    'var(--font-serif)',
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(36px, 5vw, 64px)',
            lineHeight:    1.05,
            letterSpacing: '-0.03em',
            color:         'var(--fg-1)',
            textAlign:     'center',
            margin:        '0 0 var(--sp-3)',
            maxWidth:      700,
          }}
        >
          You won&apos;t notice it&apos;s there.
        </h2>
      </ScrollReveal>

      <ScrollReveal delay={150}>
        <p
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize:   17,
            lineHeight: 1.6,
            color:      'var(--fg-2)',
            textAlign:  'center',
            maxWidth:   500,
            margin:     '0 0 var(--sp-9)',
          }}
        >
          Polter runs so light you&apos;d forget it was there if it didn&apos;t occasionally say something.
        </p>
      </ScrollReveal>

      {/* Two massive metric cards */}
      <div
        className="lightweight-grid"
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 'var(--sp-5)',
          width:               '100%',
          maxWidth:            900,
          alignItems:          'stretch',
        }}
      >
        {[
          {
            Icon:    CpuIcon,
            prefix:  '< ',
            target:  1,
            suffix:  '%',
            label:   'CPU usage',
            detail:  "Game, edit video, compile code. Polter stays out of the way. You won\u2019t see it in Task Manager.",
            delay:   200,
          },
          {
            Icon:    MemoryIcon,
            prefix:  '~',
            target:  12,
            suffix:  ' MB',
            label:   'Memory footprint',
            detail:  'Lighter than a single browser tab. Runs in the background, barely there.',
            delay:   350,
          },
        ].map((card, i) => (
          <ScrollReveal key={i} delay={card.delay} style={{ height: '100%' }}>
            <div
              className="lightweight-card"
              style={{
                background:    'var(--bg-2)',
                borderRadius:  'var(--radius-lg)',
                border:        '1px solid var(--border-1)',
                padding:       'clamp(32px, 4vw, 56px)',
                display:       'flex',
                flexDirection: 'column',
                height:        '100%',
              }}
            >
              <card.Icon size={40} color="var(--accent)" />

              <div
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      'clamp(64px, 8vw, 120px)',
                  lineHeight:    1,
                  fontWeight:    400,
                  color:         'var(--fg-1)',
                  letterSpacing: '-0.04em',
                  margin:        'var(--sp-5) 0 var(--sp-3)',
                  whiteSpace:    'nowrap',
                  overflow:      'hidden',
                }}
              >
                <AnimatedNumber target={card.target} prefix={card.prefix} suffix={card.suffix} delay={card.delay} />
              </div>

              <div
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      12,
                  letterSpacing: 'var(--ls-caps)',
                  textTransform: 'uppercase',
                  color:         'var(--fg-3)',
                  marginBottom:  'var(--sp-5)',
                }}
              >
                {card.label}
              </div>

              <p
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize:   15,
                  lineHeight: 1.6,
                  color:      'var(--fg-2)',
                  margin:     'auto 0 0',
                  maxWidth:   300,
                }}
              >
                {card.detail}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .lightweight-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
