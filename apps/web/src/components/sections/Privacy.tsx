import { ScrollReveal } from '@/components/ui/ScrollReveal';

const SEES = [
  'Keystroke timing — when, not what',
  'Mouse path and idle gaps',
  'Window switches and focus durations',
  'Time of day and day of week',
];

const NEVER_SEES = [
  'The words you type',
  'The websites you visit',
  'The contents of your screen',
  'Anything sent to a server',
];

const TIERS = [
  {
    label: 'TIER 1 · AUTOMATIC',
    desc:  'Keystroke timing, mouse behavior, app focus, system activity. Collected from install. No content, only patterns.',
  },
  {
    label: 'TIER 2 · OPT-IN',
    desc:  "Screen content classification, clipboard frequency, calendar proximity. Each one asked separately during setup. Skip any or all.",
  },
  {
    label: 'TIER 3 · FUTURE',
    desc:  "Webcam and microphone signals. Not in the current release. Designed and waiting for when it's ready.",
  },
];

export function Privacy() {
  return (
    <section
      id="privacy"
      style={{ background: 'var(--bg-0)', padding: 'var(--sp-9) clamp(24px, 6vw, 80px)' }}
    >
      <ScrollReveal>
        <div className="eyebrow mb-4" style={{ color: 'var(--fg-3)' }}>Privacy</div>
        <h2
          style={{
            fontFamily:    'var(--font-serif)',
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(26px, 3.5vw, 48px)',
            lineHeight:    1.1,
            letterSpacing: '-0.02em',
            margin:        '0 0 var(--sp-8)',
          }}
        >
          <span style={{ color: 'var(--fg-1)' }}>Everything stays on your machine.</span>{' '}
          <span style={{ color: 'var(--fg-3)' }}>No account. No upload.</span>
        </h2>
      </ScrollReveal>

      <div
        className="privacy-sees"
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 'var(--sp-8)',
          marginBottom:        'var(--sp-9)',
        }}
      >
        <div>
          <div className="eyebrow mb-4" style={{ color: 'var(--mood-calm)' }}>
            WHAT POLTER SEES
          </div>
          {SEES.map((item, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div
                style={{
                  borderBottom: '1px solid var(--border-1)',
                  padding:      'var(--sp-4) 0',
                  fontFamily:   'var(--font-ui)',
                  fontSize:     16,
                  color:        'var(--fg-1)',
                }}
              >
                {item}
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div>
          <div className="eyebrow mb-4" style={{ color: 'var(--danger)' }}>
            WHAT POLTER NEVER SEES
          </div>
          {NEVER_SEES.map((item, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div
                style={{
                  borderBottom:        '1px solid var(--border-1)',
                  padding:             'var(--sp-4) 0',
                  fontFamily:          'var(--font-ui)',
                  fontSize:            16,
                  color:               'var(--fg-2)',
                  textDecoration:      'line-through',
                  textDecorationColor: 'rgba(184,106,94,0.5)',
                }}
              >
                {item}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <div
        className="privacy-tiers"
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderTop:           '1px solid var(--border-1)',
          paddingTop:          'var(--sp-7)',
        }}
      >
        {TIERS.map((tier, i) => (
          <ScrollReveal key={i} delay={i * 100}>
            <div
              style={{
                borderRight:  i < 2 ? '1px solid var(--border-1)' : 'none',
                paddingRight: i < 2 ? 'var(--sp-6)' : 0,
                paddingLeft:  i > 0 ? 'var(--sp-6)' : 0,
              }}
            >
              <div className="eyebrow mb-3" style={{ color: 'var(--fg-3)' }}>{tier.label}</div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: 1.6, color: 'var(--fg-2)', margin: 0 }}>
                {tier.desc}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={200}>
        <p
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize:   15,
            lineHeight: 1.65,
            color:      'var(--fg-2)',
            marginTop:  'var(--sp-8)',
            maxWidth:   '65ch',
          }}
        >
          Polter learns your baseline by watching patterns over weeks. The raw events are discarded.
          Only the rhythm remains. You can delete that rhythm any time.
        </p>
      </ScrollReveal>

      <style>{`
        @media (max-width: 768px) {
          .privacy-sees  { grid-template-columns: 1fr !important; }
          .privacy-tiers { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
