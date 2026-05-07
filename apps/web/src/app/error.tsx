'use client';
import { GhostSprite } from '@/components/ui/GhostSprite';
import { CandleScatter } from '@/components/ui/CandleScatter';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight:      '100dvh',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        background:     'var(--bg-0)',
        padding:        'var(--section-py) var(--section-px)',
        textAlign:      'center',
        position:       'relative',
        overflow:       'hidden',
      }}
    >
      <CandleScatter layout="c" />

      {/* Vignette */}
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:         0,
          background:    'radial-gradient(ellipse at 50% 40%, rgba(184,106,94,0.06), transparent 55%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ marginBottom: 'clamp(16px, 3vw, 24px)' }}>
        <GhostSprite name="dizzy.png" scale={4} />
      </div>

      <div
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      'clamp(48px, 10vw, 120px)',
          fontWeight:    400,
          letterSpacing: '-0.04em',
          color:         'var(--fg-1)',
          lineHeight:    1,
          marginBottom:  'clamp(10px, 2vw, 16px)',
        }}
      >
        500
      </div>

      <h1
        style={{
          fontFamily:    'var(--font-serif)',
          fontStyle:     'italic',
          fontWeight:    400,
          fontSize:      'clamp(20px, 3vw, 36px)',
          color:         'var(--fg-1)',
          margin:        '0 0 clamp(8px, 1.5vw, 12px)',
        }}
      >
        Something spooked the ghost.
      </h1>

      <p
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize:   'clamp(14px, 0.85rem + 0.2vw, 16px)',
          color:      'var(--fg-2)',
          margin:     '0 0 clamp(24px, 4vw, 32px)',
          maxWidth:   400,
        }}
      >
        An unexpected error happened. The ghost is trying to recover.
      </p>

      <div style={{ display: 'flex', gap: 'clamp(8px, 1.5vw, 12px)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          className="btn-primary"
          style={{
            background:   'var(--accent)',
            color:        '#1a1612',
            fontFamily:   'var(--font-ui)',
            fontSize:     'clamp(13px, 0.85rem + 0.1vw, 15px)',
            fontWeight:   500,
            padding:      'clamp(10px, 1.5vw, 14px) clamp(20px, 3vw, 28px)',
            borderRadius: 'var(--radius-md)',
            border:       'none',
            cursor:       'pointer',
          }}
        >
          Try again
        </button>
        <a
          href="/"
          className="btn-secondary"
          style={{
            background:     'var(--bg-2)',
            color:          'var(--fg-1)',
            fontFamily:     'var(--font-ui)',
            fontSize:       'clamp(13px, 0.85rem + 0.1vw, 15px)',
            fontWeight:     500,
            padding:        'clamp(10px, 1.5vw, 14px) clamp(20px, 3vw, 28px)',
            borderRadius:   'var(--radius-md)',
            border:         '1px solid var(--border-1)',
            textDecoration: 'none',
            display:        'inline-block',
          }}
        >
          Go home
        </a>
      </div>
    </div>
  );
}
