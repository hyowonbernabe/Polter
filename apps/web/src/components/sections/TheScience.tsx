'use client';
import { useEffect, useRef } from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { GhostSprite } from '@/components/ui/GhostSprite';
import { CandleScatter } from '@/components/ui/CandleScatter';

/* ── Inline SVG icons ── */

function KeyboardIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <line x1="6" y1="8" x2="6" y2="8" /><line x1="10" y1="8" x2="10" y2="8" />
      <line x1="14" y1="8" x2="14" y2="8" /><line x1="18" y1="8" x2="18" y2="8" />
      <line x1="6" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="18" y2="12" />
      <line x1="8" y1="16" x2="16" y2="16" />
    </svg>
  );
}

function CursorIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l7 17 2.5-6.5L20 12 4 4z" />
      <path d="M13.5 14.5L19 20" />
    </svg>
  );
}

function BrainIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 0 1 4.9 4 4 4 0 0 1 1.8 7.5A4.5 4.5 0 0 1 13 18v4h-2v-4a4.5 4.5 0 0 1-5.7-4.5A4 4 0 0 1 7.1 6 5 5 0 0 1 12 2z" />
    </svg>
  );
}

function SwitchIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="8" height="8" rx="1.5" />
      <rect x="14" y="13" width="8" height="8" rx="1.5" />
      <path d="M18 7h-4a2 2 0 0 0-2 2v2" /><path d="M15 4l3 3-3 3" />
      <path d="M6 17h4a2 2 0 0 0 2-2v-2" /><path d="M9 20l-3-3 3-3" />
    </svg>
  );
}

function SaveIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function WaveIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
      <path d="M2 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity="0.4" />
      <path d="M2 7c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity="0.4" />
    </svg>
  );
}

/* ── Data ── */

interface StudyCard {
  tag:      string;
  title:    string;
  finding:  string;
  source:   string;
  Icon:     React.ComponentType<{ size?: number; color?: string }>;
  colSpan?: number;
  rowSpan?: number;
  accent?:  boolean;
  stat?:    string;
}

const STUDIES: StudyCard[] = [
  {
    tag:     'Keystroke analysis',
    title:   'Tired fingers type different',
    finding: 'Your typing rhythm changes when you\'re fatigued. Longer pauses between keys, more backspaces, a slower cadence. Nobody needs to see what you typed to know.',
    source:  'Giancardo et al. (2016) · Scientific Reports',
    Icon:    KeyboardIcon,
    colSpan: 2,
    accent:  true,
  },
  {
    tag:     'Motor behavior',
    title:   'Your cursor gets nervous first',
    finding: 'Stress makes your mouse jittery before you feel it yourself. Tiny involuntary movements you wouldn\'t notice, but the numbers pick up on.',
    source:  'Freeman & Ambady (2010) · Behavior Research Methods',
    Icon:    CursorIcon,
    rowSpan: 2,
  },
  {
    tag:     'Mood detection',
    title:   'Mood shows up in keystrokes',
    finding: 'How someone types on a regular device can track their mood shifts over weeks. Not from the words. From the timing between them.',
    source:  'Zulueta et al. (2018) · JMIR',
    Icon:    BrainIcon,
  },
  {
    tag:     'Focus research',
    title:   'Switching costs more than you think',
    stat:    '25%',
    finding: 'Jumping between tasks more than once every three minutes makes it that much harder to get your focus back.',
    source:  'Mark et al. (2008) · CHI',
    Icon:    SwitchIcon,
  },
  {
    tag:     'Behavioral signals',
    title:   'Small habits, real signal',
    finding: 'Pressing Ctrl+S every few seconds when nothing changed? Researchers flagged that as an anxiety marker.',
    source:  'Epp et al. (2011) · CHI',
    Icon:    SaveIcon,
    colSpan: 2,
  },
  {
    tag:     'Pattern recognition',
    title:   'Breaks have a rhythm too',
    finding: 'The gaps between your bursts of activity follow a pattern. When that pattern breaks, something shifted before you noticed it did.',
    source:  'de Jong et al. (2020) · PLOS ONE',
    Icon:    WaveIcon,
  },
];

/* ── Floating decoration sprites ── */
const FLOATERS = [
  { name: 'reading.png',  top: '8%',  right: '3%',  phase: 0,   scale: 1 as const, opacity: 0.12 },
  { name: 'thinking.png', bottom: '12%', left: '2%', phase: 1.5, scale: 1 as const, opacity: 0.10 },
  { name: 'focused.png',  top: '45%', right: '1%',  phase: 2.8, scale: 1 as const, opacity: 0.08 },
];

/* ── Component ── */

export function TheScience() {
  const floatRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t   = (now - start) / 1000;
      const els = floatRef.current?.querySelectorAll<HTMLElement>('[data-phase]');
      els?.forEach(el => {
        const phase = parseFloat(el.dataset.phase ?? '0');
        const y = Math.sin((t + phase) * (Math.PI * 2) / 5) * 8;
        const x = Math.cos((t + phase) * (Math.PI * 2) / 7) * 4;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <section
      ref={floatRef}
      style={{
        background:     'var(--bg-0)',
        padding:        'var(--section-py) var(--section-px)',
        minHeight:      '100dvh',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',
        position:       'relative',
        overflow:       'hidden',
      }}
    >
      <CandleScatter layout="c" />
      {/* Floating ghost decorations */}
      {FLOATERS.map((f, i) => (
        <div
          key={i}
          data-phase={f.phase}
          style={{
            position: 'absolute',
            top:    f.top,
            right:  f.right,
            bottom: f.bottom,
            left:   f.left,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          <GhostSprite name={f.name} scale={f.scale} opacity={f.opacity} />
        </div>
      ))}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <ScrollReveal>
          <div className="eyebrow mb-4" style={{ color: 'var(--fg-3)' }}>The Science</div>
          <h2
            style={{
              fontFamily:    'var(--font-serif)',
              fontStyle:     'italic',
              fontWeight:    400,
              fontSize:      'clamp(30px, 4vw, 48px)',
              lineHeight:    1.1,
              letterSpacing: '-0.02em',
              color:         'var(--fg-1)',
              margin:        '0 0 var(--sp-5)',
              maxWidth:      560,
            }}
          >
            This isn&apos;t guesswork.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize:   16,
              lineHeight: 1.6,
              color:      'var(--fg-2)',
              margin:     '0 0 var(--sp-8)',
              maxWidth:   520,
            }}
          >
            Every pattern Polter watches for comes from a real study with real data.
          </p>
        </ScrollReveal>

        {/* Study count badge */}
        <ScrollReveal delay={50}>
          <div
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          'var(--sp-2)',
              background:   'var(--bg-2)',
              border:       '1px solid var(--border-1)',
              borderRadius: 999,
              padding:      '6px 16px',
              marginBottom: 'var(--sp-6)',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
            <span
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      11,
                letterSpacing: '0.04em',
                color:         'var(--fg-3)',
              }}
            >
              6 STUDIES REFERENCED
            </span>
          </div>
        </ScrollReveal>

        <div
          className="science-grid"
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap:                 'clamp(12px, 2vw, 16px)',
            width:               '100%',
            maxWidth:            'var(--content-max)',
          }}
        >
          {STUDIES.map((study, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div
                className={`science-card science-card-${i}`}
                style={{
                  background:    study.accent ? 'var(--accent)' : 'var(--bg-2)',
                  borderRadius:  'var(--radius-lg)',
                  border:        study.accent ? 'none' : '1px solid var(--border-1)',
                  padding:       'var(--sp-6)',
                  display:       'flex',
                  flexDirection: 'column',
                  justifyContent:'space-between',
                  height:        '100%',
                }}
              >
                <div>
                  {/* Icon + tag row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
                    <study.Icon
                      size={22}
                      color={study.accent ? 'rgba(0,0,0,0.5)' : 'var(--fg-3)'}
                    />
                    <span
                      style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      'var(--fs-xs)',
                        letterSpacing: 'var(--ls-caps)',
                        textTransform: 'uppercase',
                        color:         study.accent ? 'rgba(0,0,0,0.5)' : 'var(--fg-3)',
                      }}
                    >
                      {study.tag}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontFamily:    'var(--font-ui)',
                      fontWeight:    600,
                      fontSize:      'clamp(17px, 1.4vw, 20px)',
                      lineHeight:    1.3,
                      color:         study.accent ? 'rgba(0,0,0,0.9)' : 'var(--fg-1)',
                      margin:        '0 0 var(--sp-3)',
                    }}
                  >
                    {study.title}
                  </h3>

                  {/* Stat callout */}
                  {study.stat && (
                    <div
                      style={{
                        fontFamily:    'var(--font-serif)',
                        fontWeight:    400,
                        fontSize:      'clamp(40px, 5vw, 64px)',
                        lineHeight:    1,
                        letterSpacing: '-0.03em',
                        color:         'var(--fg-1)',
                        marginBottom:  'var(--sp-2)',
                      }}
                    >
                      {study.stat}
                    </div>
                  )}

                  {/* Finding */}
                  <p
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontStyle:  'italic',
                      fontSize:   15,
                      lineHeight: 1.55,
                      color:      study.accent ? 'rgba(0,0,0,0.75)' : 'var(--fg-2)',
                      margin:     0,
                    }}
                  >
                    {study.finding}
                  </p>
                </div>

                {/* Source */}
                <div
                  style={{
                    borderTop:  study.accent ? '1px solid rgba(0,0,0,0.12)' : '1px solid var(--border-1)',
                    paddingTop: 'var(--sp-3)',
                    marginTop:  'var(--sp-5)',
                  }}
                >
                  <span
                    style={{
                      fontFamily:    'var(--font-mono)',
                      fontSize:      10,
                      letterSpacing: '0.04em',
                      color:         study.accent ? 'rgba(0,0,0,0.4)' : 'var(--fg-3)',
                    }}
                  >
                    {study.source}
                  </span>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom note */}
        <ScrollReveal delay={650}>
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize:   14,
              lineHeight: 1.6,
              color:      'var(--fg-3)',
              marginTop:  'var(--sp-7)',
              maxWidth:   480,
            }}
          >
            Polter doesn&apos;t invent signals. It watches for what science already measured.
          </p>
        </ScrollReveal>
      </div>

      <style>{`
        .science-grid > * { min-height: 0; }
        .science-card { min-height: 180px; }
      `}</style>
    </section>
  );
}
