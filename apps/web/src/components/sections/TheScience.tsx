import { ScrollReveal } from '@/components/ui/ScrollReveal';

const FINDINGS = [
  'keystroke timing reliably shifts under fatigue — slower rhythm, longer holds, more corrections.',
  'mouse jitter increases measurably under stress before the person consciously feels it.',
  'context-switching more than once every three minutes degrades focus recovery by 25%.',
  'compulsive saving — ctrl+s every few seconds — is a documented behavioral marker for anxiety.',
];

const CITATIONS = [
  'Giancardo et al. (2016) · Scientific Reports',
  'Zulueta et al. (2018) · JMIR',
  'de Jong et al. (2020) · PLOS ONE',
  'Mark et al. (2008) · CHI',
  'Epp et al. (2011) · CHI',
  'Freeman & Ambady (2010) · Behavior Research Methods',
];

export function TheScience() {
  return (
    <section style={{ background: 'var(--bg-0)', padding: 'var(--sp-9) clamp(24px, 6vw, 80px)' }}>
      <ScrollReveal>
        <div className="eyebrow mb-4" style={{ color: 'var(--fg-3)' }}>the science</div>
        <h2
          style={{
            fontFamily:    'var(--font-serif)',
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(30px, 4vw, 48px)',
            lineHeight:    1.1,
            letterSpacing: '-0.02em',
            color:         'var(--fg-1)',
            textTransform: 'lowercase',
            margin:        '0 0 var(--sp-9)',
            maxWidth:      480,
          }}
        >
          this isn&apos;t guesswork.
        </h2>
      </ScrollReveal>

      <div
        style={{
          display:             'grid',
          gridTemplateColumns: '55fr 45fr',
          gap:                 'var(--sp-8)',
          alignItems:          'start',
        }}
      >
        {/* Left: findings */}
        <div>
          {FINDINGS.map((finding, i) => (
            <ScrollReveal key={i} delay={i * 120}>
              <div
                style={{
                  borderTop:     '1px solid var(--border-1)',
                  paddingTop:    'var(--sp-5)',
                  paddingBottom: 'var(--sp-7)',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontStyle:  'italic',
                    fontSize:   'clamp(16px, 2vw, 24px)',
                    lineHeight: 1.45,
                    color:      'var(--fg-1)',
                    margin:     0,
                  }}
                >
                  {finding}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Right: citations, offset 80px down */}
        <div style={{ marginTop: 80 }}>
          {CITATIONS.map((cite, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div
                style={{
                  borderBottom:  '1px solid var(--border-1)',
                  padding:       'var(--sp-3) 0',
                  fontFamily:    'var(--font-mono)',
                  fontSize:      'var(--fs-xs)',
                  letterSpacing: 'var(--ls-caps)',
                  textTransform: 'uppercase',
                  color:         'var(--fg-3)',
                }}
              >
                {cite}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .science-inner { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
