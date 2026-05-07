import { ScrollReveal } from '@/components/ui/ScrollReveal';

const MOOD_COLORS: Record<string, string> = {
  restless: 'var(--mood-restless)',
  calm:     'var(--mood-calm)',
  tired:    'var(--mood-tired)',
};

interface SampleCard {
  voice:     string;
  mood:      string;
  moodLabel: string;
  time:      string;
  large?:    boolean;
}

const SAMPLES: SampleCard[] = [
  {
    voice:     'three context switches in the last ten minutes. your usual is one.',
    mood:      'restless',
    moodLabel: 'restless',
    time:      '04:21pm',
    large:     true,
  },
  {
    voice:     'your typing has settled. forty-one keystrokes a minute, steady.',
    mood:      'calm',
    moodLabel: 'calm',
    time:      '02:08pm',
  },
  {
    voice:     "you've come back to this file four times today.",
    mood:      'tired',
    moodLabel: 'tired',
    time:      '11:42am',
  },
];

function VoiceCard({ card, delay = 0 }: { card: SampleCard; delay?: number }) {
  return (
    <ScrollReveal delay={delay}>
      <div
        style={{
          background:   'var(--bg-paper)',
          borderRadius: 'var(--radius-bubble)',
          border:       '1px solid var(--border-light)',
          padding:      'var(--sp-6)',
          display:      'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight:    card.large ? 260 : 170,
          height:       card.large ? '100%' : undefined,
        }}
      >
        <p
          style={{
            fontFamily:    'var(--font-serif)',
            fontStyle:     'italic',
            fontSize:      card.large ? 22 : 18,
            lineHeight:    1.45,
            color:         'var(--fg-ink)',
            textTransform: 'lowercase',
            margin:        '0 0 var(--sp-5)',
            flex:          1,
          }}
        >
          {card.voice}
        </p>
        <div
          style={{
            borderTop:  '1px solid var(--border-light)',
            paddingTop: 'var(--sp-3)',
            display:    'flex',
            alignItems: 'center',
            gap:        'var(--sp-2)',
          }}
        >
          <div
            style={{
              width:        5,
              height:       5,
              borderRadius: '50%',
              background:   MOOD_COLORS[card.mood],
              flexShrink:   0,
            }}
          />
          <span
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      10,
              letterSpacing: 'var(--ls-caps)',
              textTransform: 'uppercase',
              color:         'var(--fg-ink-3)',
            }}
          >
            {card.time} · {card.moodLabel}
          </span>
        </div>
      </div>
    </ScrollReveal>
  );
}

export function VoiceSamples() {
  return (
    <section style={{ background: 'var(--bg-light)', padding: 'var(--sp-9) clamp(24px, 6vw, 80px)' }}>
      <ScrollReveal>
        <div className="eyebrow mb-4" style={{ color: 'var(--fg-ink-3)' }}>
          what it might say
        </div>
        <h2
          style={{
            fontFamily:    'var(--font-serif)',
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(32px, 4.5vw, 56px)',
            lineHeight:    1.05,
            letterSpacing: '-0.02em',
            textTransform: 'lowercase',
            margin:        '0 0 var(--sp-8)',
          }}
        >
          <span style={{ color: 'var(--fg-ink)' }}>one sentence.</span>{' '}
          <span style={{ color: 'var(--fg-ink-3)' }}>maybe two.</span>
        </h2>
      </ScrollReveal>

      <div
        className="voice-grid"
        style={{
          display:             'grid',
          gridTemplateColumns: '60fr 40fr',
          gap:                 'var(--sp-4)',
          alignItems:          'stretch',
        }}
      >
        <VoiceCard card={SAMPLES[0]} delay={0} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <VoiceCard card={SAMPLES[1]} delay={150} />
          <VoiceCard card={SAMPLES[2]} delay={300} />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .voice-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
