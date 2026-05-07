'use client';
import { useEffect, useRef } from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { GhostSprite } from '@/components/ui/GhostSprite';

const CONSTELLATION = [
  { name: 'focused.png',    scale: 2 as const, opacity: 0.90, top: '5%',  left: '10%', phase: 0.0,  label: 'focused'    },
  { name: 'calm.png',       scale: 2 as const, opacity: 0.80, top: '38%', left: '54%', phase: 1.2,  label: 'calm'       },
  { name: 'excited.png',    scale: 2 as const, opacity: 0.85, top: '2%',  left: '56%', phase: 0.8,  label: 'excited'    },
  { name: 'overworked.png', scale: 1 as const, opacity: 0.70, top: '60%', left: '5%',  phase: 2.1,  label: 'overworked' },
  { name: 'sleepy.png',     scale: 1 as const, opacity: 0.60, top: '70%', left: '65%', phase: 1.7,  label: 'sleepy'     },
  { name: 'sleeping.png',   scale: 1 as const, opacity: 0.40, top: '80%', left: '35%', phase: 3.0,  label: 'sleeping'   },
  { name: 'grab.png',       scale: 2 as const, opacity: 0.80, top: '40%', left: '22%', phase: 0.5,  label: 'grab'       },
  { name: 'reading.png',    scale: 2 as const, opacity: 0.75, top: '18%', left: '74%', phase: 2.4,  label: 'reading'    },
  { name: 'box.png',        scale: 2 as const, opacity: 0.70, top: '58%', left: '46%', phase: 1.0,  label: 'hiding'     },
];

export function TheCreature() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);

  // Independent sine drift per sprite
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const t   = (now - start) / 1000;
      const els = containerRef.current?.querySelectorAll<HTMLElement>('[data-drift]');
      els?.forEach(el => {
        const phase = parseFloat(el.dataset.drift ?? '0');
        el.style.transform = `translateY(${Math.sin((t + phase) * (Math.PI * 2) / 4) * 6}px)`;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <section style={{ background: 'var(--bg-1)', padding: 'var(--sp-9) clamp(24px, 6vw, 80px)' }}>
      <div
        className="creature-grid"
        style={{
          display:             'grid',
          gridTemplateColumns: '45fr 55fr',
          gap:                 'var(--sp-8)',
          alignItems:          'center',
        }}
      >
        {/* Left: text */}
        <div>
          <ScrollReveal>
            <div className="eyebrow mb-4" style={{ color: 'var(--fg-3)' }}>the creature</div>
            <h2
              style={{
                fontFamily:    'var(--font-serif)',
                fontStyle:     'italic',
                fontWeight:    400,
                fontSize:      'clamp(26px, 3.2vw, 42px)',
                lineHeight:    1.15,
                letterSpacing: '-0.02em',
                color:         'var(--fg-1)',
                textTransform: 'lowercase',
                margin:        '0 0 var(--sp-5)',
              }}
            >
              the ghost is the product.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 16, lineHeight: 1.65, color: 'var(--fg-2)', margin: 0 }}>
              its mood mirrors yours. when you&apos;re focused, it&apos;s calm. when you&apos;re rushing,
              it&apos;s restless. when you&apos;re exhausted, it droops. you understand how you&apos;re doing
              by looking at how it&apos;s doing.
            </p>
          </ScrollReveal>
        </div>

        {/* Right: sprite constellation + product mockup placeholder */}
        <div ref={containerRef} style={{ position: 'relative', height: 420 }}>
          {/* Product mockup placeholder */}
          <div
            style={{
              position:     'absolute',
              bottom:       0,
              right:        0,
              width:        '68%',
              aspectRatio:  '16/10',
              background:   'var(--bg-2)',
              borderRadius: 'var(--radius-lg)',
              border:       '1px solid var(--border-1)',
            }}
          />
          {/* Constellation */}
          {CONSTELLATION.map((sp, i) => (
            <div key={i} data-drift={sp.phase} style={{ position: 'absolute', top: sp.top, left: sp.left }}>
              <div style={{ position: 'relative' }}>
                <GhostSprite name={sp.name} scale={sp.scale} opacity={sp.opacity} />
                <span
                  style={{
                    position:   'absolute',
                    bottom:     -16,
                    left:       '50%',
                    transform:  'translateX(-50%)',
                    fontFamily: 'var(--font-mono)',
                    fontSize:   10,
                    letterSpacing: '0.04em',
                    color:      'var(--fg-3)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sp.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .creature-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
