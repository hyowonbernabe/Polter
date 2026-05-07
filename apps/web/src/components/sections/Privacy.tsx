import { ScrollReveal } from '@/components/ui/ScrollReveal';

const SEES = [
  'keystroke timing — when, not what',
  'mouse path and idle gaps',
  'window switches and focus durations',
  'time of day and day of week',
];

const NEVER_SEES = [
  'the words you type',
  'the websites you visit',
  'the contents of your screen',
  'anything sent to a server',
];

const TIERS = [
  {
    label: 'TIER 1 · AUTOMATIC',
    desc:  'keystroke timing, mouse behavior, app focus, system activity. collected from install. no content, only patterns.',
  },
  {
    label: 'TIER 2 · OPT-IN',
    desc:  "screen content classification, clipboard frequency, calendar proximity. each one asked separately during setup. skip any or all.",
  },
  {
    label: 'TIER 3 · FUTURE',
    desc:  "webcam and microphone signals. not in the current release. designed and waiting for when it's ready.",
  },
];

export function Privacy() {
  return (
    <section
      id="privacy"
      style={{ background: 'var(--bg-paper)', padding: 'var(--sp-9) clamp(24px, 6vw, 80px)' }}
    >
      <ScrollReveal>
        <div className="eyebrow mb-4" style={{ color: 'var(--fg-ink-3)' }}>privacy</div>
        <h2
          style={{
            fontFamily:    'var(--font-serif)',
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(26px, 3.5vw, 48px)',
            lineHeight:    1.1,
            letterSpacing: '-0.02em',
            textTransform: 'lowercase',
            margin:        '0 0 var(--sp-8)',
          }}
        >
          <span style={{ color: 'var(--fg-ink)' }}>everything stays on your machine.</span>{' '}
          <span style={{ color: 'var(--fg-ink-3)' }}>no account. no upload.</span>
        </h2>
      </ScrollReveal>

      {/* Part A: sees / never sees */}
      <div
        className="privacy-sees"
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 'var(--sp-8)',
          marginBottom:        'var(--sp-9)',
        }}
      >
        {/* What it sees */}
        <div>
          <div className="eyebrow mb-4" style={{ color: 'var(--mood-calm)' }}>
            WHAT POLTER SEES
          </div>
          {SEES.map((item, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div
                style={{
                  borderBottom: '1px solid var(--border-light)',
                  padding:      'var(--sp-4) 0',
                  fontFamily:   'var(--font-ui)',
                  fontSize:     16,
                  color:        'var(--fg-ink)',
                }}
              >
                {item}
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* What it never sees */}
        <div>
          <div className="eyebrow mb-4" style={{ color: 'var(--danger)' }}>
            WHAT POLTER NEVER SEES
          </div>
          {NEVER_SEES.map((item, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div
                style={{
                  borderBottom:          '1px solid var(--border-light)',
                  padding:               'var(--sp-4) 0',
                  fontFamily:            'var(--font-ui)',
                  fontSize:              16,
                  color:                 'var(--fg-ink-2)',
                  textDecoration:        'line-through',
                  textDecorationColor:   'rgba(184,106,94,0.5)',
                }}
              >
                {item}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Part B: tiers */}
      <div
        className="privacy-tiers"
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderTop:           '1px solid var(--border-light)',
          paddingTop:          'var(--sp-7)',
        }}
      >
        {TIERS.map((tier, i) => (
          <ScrollReveal key={i} delay={i * 100}>
            <div
              style={{
                borderRight:  i < 2 ? '1px solid var(--border-light)' : 'none',
                paddingRight: i < 2 ? 'var(--sp-6)' : 0,
                paddingLeft:  i > 0 ? 'var(--sp-6)' : 0,
              }}
            >
              <div className="eyebrow mb-3" style={{ color: 'var(--fg-ink-3)' }}>{tier.label}</div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: 1.6, color: 'var(--fg-ink-2)', margin: 0 }}>
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
            color:      'var(--fg-ink-2)',
            marginTop:  'var(--sp-8)',
            maxWidth:   '65ch',
          }}
        >
          polter learns your baseline by watching patterns over weeks. the raw events are discarded.
          only the rhythm remains. you can delete that rhythm any time.
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
