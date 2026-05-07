export function Hero() {
  return (
    <section
      className="relative overflow-visible"
      style={{
        width:      '100%',
        height:     '100dvh',
        background: 'var(--bg-0)',
      }}
    >
      {/* Warm vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 70% 30%, rgba(212,184,122,0.08), transparent 60%)',
        }}
      />

      {/* Text content — left aligned */}
      <div
        className="relative z-10 h-full"
        style={{
          display:       'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding:       '0 5vw',
          maxWidth:      '50%',
        }}
      >
        <div
          className="eyebrow"
          style={{
            color:         'var(--fg-3)',
            letterSpacing: '0.18em',
            marginBottom:  20,
          }}
        >
          A quiet desktop companion
        </div>

        <h1
          style={{
            fontFamily:    'var(--font-serif)',
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(56px, 8vw, 120px)',
            lineHeight:    0.95,
            letterSpacing: '-0.03em',
            color:         'var(--ghost)',
            margin:        '0 0 32px',
          }}
        >
          Something is watching you work.
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize:   20,
            lineHeight: 1.6,
            color:      'var(--fg-2)',
            maxWidth:   540,
            margin:     '0 0 40px',
          }}
        >
          A pixel ghost that observes the quiet signals in how you work. Keystroke
          rhythm, mouse behavior, focus patterns. Backed by real research, never
          invasive. Everything stays on your machine.
        </p>

        <div className="flex items-center gap-4 flex-wrap" style={{ marginBottom: 32 }}>
          <a
            href="https://github.com/hyowonbernabe/Polter"
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{
              background:     'var(--accent)',
              color:          '#1a1612',
              fontFamily:     'var(--font-ui)',
              fontSize:       15,
              fontWeight:     500,
              padding:        '14px 28px',
              borderRadius:   'var(--radius-md)',
              textDecoration: 'none',
            }}
          >
            View on GitHub
          </a>
          <a
            href="#about"
            className="eyebrow"
            style={{
              color:          'var(--fg-2)',
              textDecoration: 'none',
              padding:        '14px 16px',
            }}
          >
            Read more below →
          </a>
        </div>

        <div
          className="eyebrow"
          style={{ color: 'var(--fg-3)', letterSpacing: '0.06em' }}
        >
          Windows · Open source · Everything stays on your machine
        </div>
      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 768px) {
          section > .z-10 {
            max-width: 100% !important;
            padding: 100px var(--sp-5) var(--sp-7) !important;
          }
        }
      `}</style>
    </section>
  );
}
