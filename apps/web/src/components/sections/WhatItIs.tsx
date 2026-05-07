import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function WhatItIs() {
  return (
    <section
      id="about"
      style={{ background: 'var(--bg-light)', padding: 'var(--sp-9) 0' }}
    >
      <div
        style={{
          maxWidth: 720,
          marginLeft:  'clamp(24px, 15vw, 200px)',
          marginRight: 'clamp(24px, 5vw, 80px)',
        }}
      >
        <ScrollReveal>
          <div className="eyebrow mb-6" style={{ color: 'var(--fg-ink-3)' }}>
            what is polter
          </div>
        </ScrollReveal>
        <ScrollReveal delay={150}>
          <p
            style={{
              fontFamily:    'var(--font-serif)',
              fontStyle:     'italic',
              fontWeight:    400,
              fontSize:      'clamp(26px, 3.5vw, 42px)',
              lineHeight:    1.3,
              letterSpacing: '-0.02em',
              color:         'var(--fg-ink)',
              textTransform: 'lowercase',
              margin:        0,
            }}
          >
            you install it once and forget about it. it watches how you behave — speed, rhythm,
            pauses, patterns — and over time, it tells you things about yourself that you never knew.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
