import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { CandleScatter } from '@/components/ui/CandleScatter';

function DownloadIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function BubbleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

const STEPS = [
  {
    num: '01',
    title: 'Install It',
    desc: "Download Polter. A small ghost shows up on your desktop. That's it.",
    detail: 'One installer. No account.',
    Icon: DownloadIcon,
  },
  {
    num: '02',
    title: 'Forget About It',
    desc: 'It watches your patterns quietly. Keystroke timing, mouse rhythm, app switching, and more. Never invasive.',
    detail: 'Runs in the background. Uses less than 1% CPU.',
    Icon: EyeIcon,
  },
  {
    num: '03',
    title: 'It Notices',
    desc: 'After observation, it will tell you everything.',
    detail: 'A quiet observation, a chart, or a gentle nudge.',
    Icon: BubbleIcon,
  },
];

export function HowItWorks() {
  return (
    <section
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
        padding: 'var(--sp-9) 0',
      }}
    >
      <CandleScatter layout="b" />
      <div style={{ padding: '0 5vw', width: '100%' }}>
        {/* Eyebrow */}
        <ScrollReveal>
          <div
            className="eyebrow"
            style={{
              color: 'var(--fg-3)',
              textAlign: 'center',
              marginBottom: 'var(--sp-5)',
            }}
          >
            How It Works
          </div>
        </ScrollReveal>

        {/* Big headline */}
        <ScrollReveal delay={100}>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(32px, 4.5vw, 56px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--fg-1)',
              textAlign: 'center',
              margin: '0 auto var(--sp-9)',
              maxWidth: 600,
            }}
          >
            Three steps. Nothing else.
          </h2>
        </ScrollReveal>

        {/* Cards */}
        <div
          className="how-cards"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--sp-6)',
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          {STEPS.map((step, i) => (
            <ScrollReveal key={step.num} delay={150 + i * 150} variant="fade-up">
              <div
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border-1)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--sp-8) var(--sp-6)',
                  position: 'relative',
                  overflow: 'hidden',
                  textAlign: 'center',
                }}
              >
                {/* Accent line at top */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 'var(--sp-6)',
                    right: 'var(--sp-6)',
                    height: 1,
                    background: 'var(--accent)',
                    opacity: 0.3,
                  }}
                />

                {/* Large faded step number */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: -10,
                    right: 16,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 140,
                    fontWeight: 700,
                    color: 'var(--fg-1)',
                    opacity: 0.04,
                    lineHeight: 1,
                    pointerEvents: 'none',
                  }}
                >
                  {step.num}
                </div>

                {/* Icon */}
                <div style={{ marginBottom: 'var(--sp-5)', display: 'inline-block' }}>
                  <step.Icon />
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 600,
                    fontSize: 22,
                    color: 'var(--fg-1)',
                    margin: '0 0 var(--sp-3)',
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: 'var(--fg-2)',
                    margin: '0 0 var(--sp-5)',
                  }}
                >
                  {step.desc}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--fs-xs)',
                    letterSpacing: 'var(--ls-mono)',
                    color: 'var(--fg-3)',
                    margin: 0,
                  }}
                >
                  {step.detail}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          .how-cards {
            grid-template-columns: 1fr !important;
            max-width: 400px !important;
            margin: 0 auto !important;
          }
        }
      `}</style>
    </section>
  );
}
