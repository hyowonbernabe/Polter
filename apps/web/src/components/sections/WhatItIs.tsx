import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { GhostSprite } from '@/components/ui/GhostSprite';

const TYPO_SIZE = 'clamp(44px, 11vw, 160px)';

const serif: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: TYPO_SIZE,
  lineHeight: 1.1,
  letterSpacing: '-0.03em',
  color: 'var(--fg-1)',
};

const sans: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontWeight: 600,
  fontSize: TYPO_SIZE,
  lineHeight: 1.1,
  letterSpacing: '-0.03em',
  color: 'var(--fg-1)',
};

const pillBase: React.CSSProperties = {
  width: 'clamp(80px, 16vw, 240px)',
  height: 'clamp(44px, 8vw, 120px)',
  borderRadius: 999,
  objectFit: 'cover',
  flexShrink: 0,
  margin: '0 0.15em',
};

export function WhatItIs() {
  return (
    <section
      id="about"
      style={{
        background: 'var(--bg-0)',
        width: '100%',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '0 5vw',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <ScrollReveal>
          <div
            className="eyebrow"
            style={{ color: 'var(--fg-3)', marginBottom: 'var(--sp-6)', textAlign: 'center' }}
          >
            What Is Polter
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="flex items-center justify-center" style={{ gap: '0.25em', flexWrap: 'wrap' }}>
            <span style={serif}>A quiet</span>
            <img
              src="https://placehold.co/480x240"
              alt=""
              style={{ ...pillBase, transform: 'rotate(-5deg)' }}
            />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="flex items-center justify-center" style={{ gap: '0.25em', flexWrap: 'wrap' }}>
            <span style={sans}>little</span>
            <GhostSprite name="front.png" scale={2} />
            <span style={{ ...sans, color: 'var(--accent)' }}>ghost</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div style={{ textAlign: 'center' }}>
            <span style={serif}>watches how</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={400}>
          <div className="flex items-center justify-center" style={{ gap: '0.25em', flexWrap: 'wrap' }}>
            <span style={sans}>you</span>
            <img
              src="https://placehold.co/480x240"
              alt=""
              style={{ ...pillBase, transform: 'rotate(4deg)' }}
            />
            <span style={{ ...sans, color: 'var(--mood-restless)' }}>work.</span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
