import { GhostSprite } from '@/components/ui/GhostSprite';
import { CandleScatter } from '@/components/ui/CandleScatter';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight:      '100dvh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        background:     'var(--bg-0)',
        padding:        32,
        textAlign:      'center',
        position:       'relative',
        overflow:       'hidden',
      }}
    >
      <CandleScatter layout="b" />

      {/* Vignette */}
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:         0,
          background:    'radial-gradient(ellipse at 50% 40%, rgba(212,184,122,0.06), transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ marginBottom: 24 }}>
        <GhostSprite name="box.png" scale={4} />
      </div>

      <div
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      'clamp(64px, 10vw, 120px)',
          fontWeight:    400,
          letterSpacing: '-0.04em',
          color:         'var(--fg-1)',
          lineHeight:    1,
          marginBottom:  16,
        }}
      >
        404
      </div>

      <h1
        style={{
          fontFamily:    'var(--font-serif)',
          fontStyle:     'italic',
          fontWeight:    400,
          fontSize:      'clamp(24px, 3vw, 36px)',
          color:         'var(--fg-1)',
          margin:        '0 0 12px',
        }}
      >
        The ghost looked everywhere.
      </h1>

      <p
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize:   16,
          color:      'var(--fg-2)',
          margin:     '0 0 32px',
          maxWidth:   400,
        }}
      >
        This page doesn&apos;t exist, or it wandered off somewhere.
      </p>

      <a
        href="/"
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
          display:        'inline-block',
        }}
      >
        Go home
      </a>
    </div>
  );
}
