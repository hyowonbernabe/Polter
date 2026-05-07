import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { GhostSprite } from '@/components/ui/GhostSprite';

/* ── Icons ── */

function EyeIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

function LockIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ToggleIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="5" width="22" height="14" rx="7" />
      <circle cx="8" cy="12" r="3" />
    </svg>
  );
}

function FlaskIcon({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6v5l4 9H5l4-9V3z" />
      <line x1="9" y1="3" x2="15" y2="3" />
      <path d="M7 17h10" />
    </svg>
  );
}

/* ── Data ── */

const SEES = [
  'Keystroke timing, not which key',
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

interface TierCard {
  num:   string;
  title: string;
  desc:  string;
  icon:  React.ComponentType<{ size?: number; color?: string }>;
  color: string;
}

const TIERS: TierCard[] = [
  {
    num:   '01',
    title: 'Automatic',
    desc:  'Keystroke timing, mouse behavior, app focus, system activity. Runs from install. No content is ever captured, only patterns.',
    icon:  LockIcon,
    color: 'var(--mood-calm)',
  },
  {
    num:   '02',
    title: 'Opt-in',
    desc:  'Screen content classification, clipboard frequency, calendar proximity. Each one asked separately. Skip any or all of them.',
    icon:  ToggleIcon,
    color: 'var(--accent)',
  },
  {
    num:   '03',
    title: 'Future',
    desc:  'Webcam and microphone signals. Not in the current release. Designed and waiting for when the tech is ready.',
    icon:  FlaskIcon,
    color: 'var(--fg-3)',
  },
];

/* ── Component ── */

export function Privacy() {
  return (
    <section
      id="privacy"
      style={{
        background:     'var(--bg-0)',
        minHeight:      '100dvh',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',
        position:       'relative',
        overflow:       'hidden',
        padding:        'var(--sp-9) clamp(24px, 6vw, 80px)',
      }}
    >
      {/* Ghost decoration */}
      <div
        style={{
          position:      'absolute',
          bottom:        '8%',
          right:         '4%',
          opacity:       0.05,
          pointerEvents: 'none',
        }}
      >
        <GhostSprite name="quiet.png" scale={8} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <ScrollReveal>
          <div className="eyebrow mb-4" style={{ color: 'var(--fg-3)' }}>Privacy</div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <h2
            style={{
              fontFamily:    'var(--font-serif)',
              fontStyle:     'italic',
              fontWeight:    400,
              fontSize:      'clamp(34px, 4.5vw, 60px)',
              lineHeight:    1.05,
              letterSpacing: '-0.02em',
              color:         'var(--fg-1)',
              margin:        '0 0 var(--sp-3)',
              maxWidth:      650,
            }}
          >
            Everything stays on your machine.
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <p
            style={{
              fontFamily:    'var(--font-ui)',
              fontSize:      'clamp(17px, 1.8vw, 20px)',
              lineHeight:    1.5,
              color:         'var(--fg-2)',
              margin:        '0 0 var(--sp-9)',
              maxWidth:      480,
            }}
          >
            No account. No upload. No cloud. Polter works offline and keeps everything local.
          </p>
        </ScrollReveal>

        {/* Sees / Never sees — two columns */}
        <div
          className="privacy-sees"
          style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 'var(--sp-8)',
            marginBottom:        'var(--sp-9)',
          }}
        >
          {/* SEES */}
          <div>
            <ScrollReveal delay={200}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-5)' }}>
                <EyeIcon size={20} color="var(--mood-calm)" />
                <span className="eyebrow" style={{ color: 'var(--mood-calm)', margin: 0 }}>
                  What Polter sees
                </span>
              </div>
            </ScrollReveal>
            {SEES.map((item, i) => (
              <ScrollReveal key={i} delay={250 + i * 80}>
                <div
                  style={{
                    borderBottom: '1px solid var(--border-1)',
                    padding:      'var(--sp-4) 0',
                    fontFamily:   'var(--font-ui)',
                    fontSize:     16,
                    lineHeight:   1.5,
                    color:        'var(--fg-1)',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          'var(--sp-3)',
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mood-calm)', flexShrink: 0 }} />
                  {item}
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* NEVER SEES */}
          <div>
            <ScrollReveal delay={200}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-5)' }}>
                <EyeOffIcon size={20} color="var(--danger)" />
                <span className="eyebrow" style={{ color: 'var(--danger)', margin: 0 }}>
                  What Polter never sees
                </span>
              </div>
            </ScrollReveal>
            {NEVER_SEES.map((item, i) => (
              <ScrollReveal key={i} delay={250 + i * 80}>
                <div
                  style={{
                    borderBottom:        '1px solid var(--border-1)',
                    padding:             'var(--sp-4) 0',
                    fontFamily:          'var(--font-ui)',
                    fontSize:            16,
                    lineHeight:          1.5,
                    color:               'var(--fg-3)',
                    textDecoration:      'line-through',
                    textDecorationColor: 'rgba(184,106,94,0.4)',
                    display:             'flex',
                    alignItems:          'center',
                    gap:                 'var(--sp-3)',
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0, opacity: 0.5 }} />
                  {item}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <ScrollReveal delay={400}>
          <div className="eyebrow mb-5" style={{ color: 'var(--fg-3)' }}>Data tiers</div>
        </ScrollReveal>

        <div
          className="privacy-tiers"
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 'var(--sp-4)',
            marginBottom:        'var(--sp-8)',
          }}
        >
          {TIERS.map((tier, i) => (
            <ScrollReveal key={i} delay={450 + i * 120}>
              <div
                style={{
                  background:    'var(--bg-2)',
                  borderRadius:  'var(--radius-lg)',
                  border:        '1px solid var(--border-1)',
                  padding:       'var(--sp-6)',
                  display:       'flex',
                  flexDirection: 'column',
                  height:        '100%',
                  minHeight:     220,
                }}
              >
                {/* Accent line */}
                <div style={{ width: 32, height: 3, borderRadius: 2, background: tier.color, marginBottom: 'var(--sp-4)', opacity: 0.6 }} />

                {/* Icon + number */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
                  <tier.icon size={24} color={tier.color} />
                  <span
                    style={{
                      fontFamily:    'var(--font-mono)',
                      fontSize:      'var(--fs-xs)',
                      letterSpacing: 'var(--ls-caps)',
                      color:         'var(--fg-3)',
                    }}
                  >
                    TIER {tier.num}
                  </span>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 600,
                    fontSize:   18,
                    color:      'var(--fg-1)',
                    margin:     '0 0 var(--sp-3)',
                  }}
                >
                  {tier.title}
                </h3>

                {/* Description */}
                <p
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize:   14,
                    lineHeight: 1.6,
                    color:      'var(--fg-2)',
                    margin:     0,
                  }}
                >
                  {tier.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom note */}
        <ScrollReveal delay={800}>
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize:   15,
              lineHeight: 1.65,
              color:      'var(--fg-2)',
              maxWidth:   '55ch',
            }}
          >
            Polter learns your baseline by watching patterns over weeks. The raw events get thrown away.
            Only the rhythm stays. You can delete it any time.
          </p>
        </ScrollReveal>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .privacy-sees  { grid-template-columns: 1fr !important; }
          .privacy-tiers { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
