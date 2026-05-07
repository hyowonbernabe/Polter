// InsightBubble.jsx — the conversational card the ghost summons.

function InsightBubble({ children, mood = 'calm', time, kind = 'pattern', tail = 'left', onDismiss, visible = true }) {
  const tintDot = window.GHOST_MOOD_TINT?.[mood] ?? '#7a9e8b';

  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(28, 31, 38, 0.92)',
        backdropFilter: 'blur(20px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.1)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 18,
        padding: '18px 22px 14px',
        maxWidth: 340,
        minWidth: 240,
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.05) inset, 0 12px 40px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.4)',
        color: '#e8e6e1',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 280ms cubic-bezier(0.4,0,0.2,1), transform 280ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {tail && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            ...(tail === 'left' ? { left: -7, top: 26 } : { right: -7, top: 26 }),
            width: 14, height: 14,
            background: 'rgba(28, 31, 38, 0.92)',
            transform: 'rotate(45deg)',
            ...(tail === 'left'
              ? { borderLeft: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }
              : { borderRight: '1px solid rgba(255,255,255,0.06)', borderTop: '1px solid rgba(255,255,255,0.06)' }),
            borderRadius: 2,
          }}
        />
      )}
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 17,
          lineHeight: 1.4,
          letterSpacing: '-0.01em',
          color: '#e8e6e1',
          textTransform: 'lowercase',
        }}
      >
        {children}
      </div>
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#6b6a66',
        }}
      >
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: tintDot }} />
        <span>{time}</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>{kind}</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>{mood}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 0,
              color: '#6b6a66',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              padding: 0,
            }}
          >
            dismiss
          </button>
        )}
      </div>
    </div>
  );
}

window.InsightBubble = InsightBubble;
