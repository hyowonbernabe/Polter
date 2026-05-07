import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { GhostSprite } from '@/components/ui/GhostSprite';

const STEPS = [
  {
    num:    '01',
    title:  'install it',
    desc:   "download polter. a small ghost appears on your desktop. that's it.",
    indent: '0',
    ghost:  false,
  },
  {
    num:    '02',
    title:  'forget about it',
    desc:   'polter watches your patterns silently. keystroke timing, mouse rhythm, app switching. never content.',
    indent: 'clamp(0px, 8vw, 96px)',
    ghost:  false,
  },
  {
    num:    '03',
    title:  'it notices',
    desc:   'when polter sees something worth saying, it tells you. one sentence. maybe two.',
    indent: 'clamp(0px, 16vw, 192px)',
    ghost:  true,
  },
];

export function HowItWorks() {
  return (
    <section style={{ background: 'var(--bg-light)', padding: 'var(--sp-9) 0' }}>
      <div style={{ marginLeft: 'clamp(24px, 8vw, 120px)', marginRight: 24, maxWidth: 680, marginBottom: 'var(--sp-7)' }}>
        <ScrollReveal>
          <div className="eyebrow" style={{ color: 'var(--fg-ink-3)' }}>how it works</div>
        </ScrollReveal>
      </div>

      <div style={{ marginTop: 'var(--sp-7)' }}>
        {STEPS.map((step, i) => (
          <ScrollReveal key={step.num} delay={i * 150} className="mb-14">
            <div
              style={{
                marginLeft:  step.indent,
                paddingLeft: 'clamp(24px, 8vw, 120px)',
                paddingRight: 24,
                maxWidth:    460,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize:   48,
                  lineHeight: 1,
                  color:      'var(--fg-ink-3)',
                  opacity:    0.4,
                  marginBottom: 'var(--sp-3)',
                }}
              >
                {step.num}
              </div>
              <h3
                style={{
                  fontFamily:   'var(--font-ui)',
                  fontWeight:   600,
                  fontSize:     20,
                  color:        'var(--fg-ink)',
                  margin:       '0 0 var(--sp-2)',
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize:   16,
                  lineHeight: 1.6,
                  color:      'var(--fg-ink-2)',
                  maxWidth:   '45ch',
                  margin:     0,
                }}
              >
                {step.desc}
              </p>
              {step.ghost && (
                <div style={{ marginTop: 'var(--sp-4)' }}>
                  <GhostSprite name="front.png" scale={1} opacity={0.5} />
                </div>
              )}
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
