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

      {/* Text content — fluid width, stacks on small screens */}
      <div
        className="relative z-10 h-full"
        style={{
          display:        'flex',
          flexDirection:  'column',
          justifyContent: 'center',
          padding:        '0 var(--section-px)',
          maxWidth:       'min(50%, 700px)',
          minWidth:       'min(100%, 340px)',
        }}
      >
        <div
          className="eyebrow"
          style={{
            color:         'var(--fg-3)',
            letterSpacing: '0.18em',
            marginBottom:  'clamp(12px, 2vw, 20px)',
          }}
        >
          A quiet desktop companion
        </div>

        <h1
          style={{
            fontFamily:    'var(--font-serif)',
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(40px, 7vw, 120px)',
            lineHeight:    0.95,
            letterSpacing: '-0.03em',
            color:         'var(--ghost)',
            margin:        '0 0 clamp(20px, 3vw, 32px)',
          }}
        >
          Something is watching you work.
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize:   'clamp(16px, 0.95rem + 0.3vw, 20px)',
            lineHeight: 1.6,
            color:      'var(--fg-2)',
            maxWidth:   'min(540px, 100%)',
            margin:     '0 0 clamp(24px, 4vw, 40px)',
          }}
        >
          A pixel ghost that observes the quiet signals in how you work. Keystroke
          rhythm, mouse behavior, focus patterns. Backed by real research, never
          invasive. Everything stays on your machine.
        </p>

        <div className="flex items-center gap-4 flex-wrap" style={{ marginBottom: 'clamp(20px, 3vw, 32px)' }}>
          <a
            href="https://github.com/hyowonbernabe/Polter"
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{
              background:     'var(--accent)',
              color:          '#1a1612',
              fontFamily:     'var(--font-ui)',
              fontSize:       'clamp(14px, 0.85rem + 0.15vw, 15px)',
              fontWeight:     500,
              padding:        'clamp(10px, 1.5vw, 14px) clamp(20px, 3vw, 28px)',
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
              padding:        'clamp(10px, 1.5vw, 14px) clamp(12px, 2vw, 16px)',
            }}
          >
            Read more below &rarr;
          </a>
        </div>

        <div
          className="eyebrow"
          style={{ color: 'var(--fg-3)', letterSpacing: '0.06em' }}
        >
          Windows &middot; Source available &middot; Everything stays on your machine
        </div>
      </div>
    </section>
  );
}
