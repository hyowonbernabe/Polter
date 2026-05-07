'use client';
import { useState, useEffect, useRef } from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { GhostSprite } from '@/components/ui/GhostSprite';

/* ── Mood cycle data ── */

interface MoodEntry {
  sprite:   string;
  label:    string;
  color:    string;
  blurb:    string;
}

const MOODS: MoodEntry[] = [
  { sprite: 'focused.png',    label: 'Focused',    color: 'var(--mood-calm)',     blurb: 'Deep in something. Steady rhythm.' },
  { sprite: 'excited.png',    label: 'Excited',    color: 'var(--accent)',        blurb: 'Fast keys, quick switches. Something clicked.' },
  { sprite: 'calm.png',       label: 'Calm',       color: 'var(--mood-calm)',     blurb: 'Even pace. Nothing urgent.' },
  { sprite: 'tired.png',      label: 'Tired',      color: 'var(--mood-tired)',    blurb: 'Slower typing. Longer pauses between actions.' },
  { sprite: 'overworked.png', label: 'Overworked', color: 'var(--mood-restless)', blurb: 'Too many tabs, too many switches.' },
  { sprite: 'sleepy.png',     label: 'Sleepy',     color: 'var(--mood-tired)',    blurb: 'Idle gaps getting longer. Might be time to stop.' },
  { sprite: 'thinking.png',   label: 'Thinking',   color: 'var(--fg-3)',          blurb: 'Mouse still. Keys quiet. Working something out.' },
  { sprite: 'reading.png',    label: 'Reading',    color: 'var(--mood-calm)',     blurb: 'Scrolling, not typing. Taking something in.' },
];

const ORBIT_SPRITES = [
  'front.png', 'calm.png', 'excited.png', 'tired.png',
  'overworked.png', 'sleepy.png', 'thinking.png', 'reading.png',
];

const ORBIT_R    = 170;
const ORBIT_SIZE = 360;

/* ── Component ── */

export function TheCreature() {
  const [activeIdx, setActiveIdx] = useState(0);
  const spriteRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef     = useRef<number>(0);

  // Cycle mood every 3s
  useEffect(() => {
    const id = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % MOODS.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Orbit: move each sprite around the circle via position, no rotation
  useEffect(() => {
    const start = performance.now();
    const count = ORBIT_SPRITES.length;
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const baseAngle = elapsed * 3; // 3 degrees per second
      spriteRefs.current.forEach((el, i) => {
        if (!el) return;
        const angle = baseAngle + (i / count) * 360;
        const rad   = (angle * Math.PI) / 180;
        const x     = Math.cos(rad) * ORBIT_R;
        const y     = Math.sin(rad) * ORBIT_R;
        el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const mood = MOODS[activeIdx];

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
      {/* Eyebrow */}
      <ScrollReveal>
        <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 'var(--sp-6)', textAlign: 'center' }}>
          Meet Polter
        </div>
      </ScrollReveal>

      {/* Centre piece: orbit + main sprite */}
      <ScrollReveal delay={100}>
        <div style={{ position: 'relative', width: ORBIT_SIZE, height: ORBIT_SIZE, margin: '0 auto var(--sp-6)' }}>

          {/* Static ring border */}
          <div
            style={{
              position:     'absolute',
              inset:        0,
              borderRadius: '50%',
              border:       '1px solid var(--border-1)',
              pointerEvents: 'none',
            }}
          />

          {/* Orbiting sprites — positioned via JS, never rotated */}
          {ORBIT_SPRITES.map((name, i) => {
            const isActive = MOODS[activeIdx]?.sprite === name;
            // Initial position (before JS takes over)
            const initAngle = (i / ORBIT_SPRITES.length) * 360;
            const initRad   = (initAngle * Math.PI) / 180;
            const ix = Math.cos(initRad) * ORBIT_R;
            const iy = Math.sin(initRad) * ORBIT_R;

            return (
              <div
                key={name}
                ref={el => { spriteRefs.current[i] = el; }}
                style={{
                  position:   'absolute',
                  top:        '50%',
                  left:       '50%',
                  transform:  `translate(calc(-50% + ${ix}px), calc(-50% + ${iy}px))`,
                  transition: 'opacity 0.5s ease',
                  opacity:    isActive ? 1 : 0.25,
                }}
              >
                <GhostSprite name={name} scale={1} />
              </div>
            );
          })}

          {/* Center: active sprite (large) */}
          <div
            style={{
              position:   'absolute',
              top:        '50%',
              left:       '50%',
              transform:  'translate(-50%, -50%)',
              transition: 'opacity 0.4s ease',
            }}
          >
            <GhostSprite name={mood.sprite} scale={4} />
          </div>
        </div>
      </ScrollReveal>

      {/* Mood label + dot */}
      <ScrollReveal delay={200}>
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            'var(--sp-2)',
            marginBottom:   'var(--sp-3)',
          }}
        >
          <div
            style={{
              width:        8,
              height:       8,
              borderRadius: '50%',
              background:   mood.color,
              transition:   'background 0.4s ease',
            }}
          />
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      13,
              letterSpacing: 'var(--ls-caps)',
              textTransform: 'uppercase',
              color:         'var(--fg-2)',
              minWidth:      100,
              textAlign:     'center',
            }}
          >
            {mood.label}
          </span>
        </div>
      </ScrollReveal>

      {/* Blurb for current mood */}
      <div
        style={{
          fontFamily:   'var(--font-serif)',
          fontStyle:    'italic',
          fontSize:     'clamp(16px, 2vw, 20px)',
          lineHeight:   1.5,
          color:        'var(--fg-2)',
          textAlign:    'center',
          maxWidth:     380,
          minHeight:    50,
          marginBottom: 'var(--sp-7)',
        }}
      >
        {mood.blurb}
      </div>

      {/* Headline */}
      <ScrollReveal delay={300}>
        <h2
          style={{
            fontFamily:    'var(--font-serif)',
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(28px, 3.5vw, 44px)',
            lineHeight:    1.15,
            letterSpacing: '-0.02em',
            color:         'var(--fg-1)',
            textAlign:     'center',
            margin:        '0 0 var(--sp-4)',
            maxWidth:      520,
          }}
        >
          It mirrors how you&apos;re doing.
        </h2>
      </ScrollReveal>

      <ScrollReveal delay={400}>
        <p
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize:   16,
            lineHeight: 1.65,
            color:      'var(--fg-2)',
            textAlign:  'center',
            maxWidth:   460,
            margin:     '0 0 var(--sp-8)',
          }}
        >
          Polter watches your patterns and shows how you&apos;re working through its mood.
          When you&apos;re focused, it&apos;s calm. When you&apos;re rushing, it gets restless.
          You understand yourself by watching it.
        </p>
      </ScrollReveal>

      {/* Mood ticker strip */}
      <ScrollReveal delay={500}>
        <div
          style={{
            display:        'flex',
            gap:            'var(--sp-2)',
            flexWrap:       'nowrap',
            justifyContent: 'center',
            overflowX:      'auto',
            maxWidth:       '100%',
            paddingBottom:  4,
          }}
        >
          {MOODS.map((m, i) => (
            <button
              key={m.label}
              onClick={() => setActiveIdx(i)}
              style={{
                background:   i === activeIdx ? 'var(--bg-2)' : 'transparent',
                border:       i === activeIdx ? '1px solid var(--border-1)' : '1px solid transparent',
                borderRadius: 999,
                padding:      '5px 10px',
                display:      'flex',
                alignItems:   'center',
                gap:          5,
                cursor:       'pointer',
                transition:   'all 0.3s ease',
                flexShrink:   0,
              }}
            >
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: m.color }} />
              <span
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      10,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color:         i === activeIdx ? 'var(--fg-1)' : 'var(--fg-3)',
                  transition:    'color 0.3s ease',
                }}
              >
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
