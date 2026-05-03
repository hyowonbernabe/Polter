// InsightCard.jsx — frosted-glass panel that says one thing.

function InsightCard({ state, onDismiss }) {
  const s = window.WISP_DATA.STATES[state];
  const ins = window.WISP_DATA.INSIGHTS[state];

  const cardStyles = {
    card: {
      width: 340,
      padding: '18px 20px',
      borderRadius: 14,
      background: 'rgba(17,20,29,0.72)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow:
        '0 24px 64px -12px rgba(0,0,0,0.6),' +
        '0 4px 16px -4px rgba(0,0,0,0.4),' +
        'inset 0 1px 0 rgba(255,255,255,0.04)',
      animation: 'panel-bloom-in 320ms cubic-bezier(0.16,1,0.3,1) both',
      color: '#f4f1ea',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    head: {
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 10,
    },
    pip: {
      width: 6, height: 6, borderRadius: '50%',
      background: s.color, boxShadow: `0 0 8px ${s.glow}`,
    },
    label: {
      fontFamily: "'Departure Mono', monospace",
      fontSize: 10, letterSpacing: '0.16em',
      color: '#a8a395', textTransform: 'lowercase',
    },
    when: {
      marginLeft: 'auto',
      fontFamily: "'Departure Mono', monospace",
      fontSize: 10, letterSpacing: '0.14em',
      color: '#6f6c63', textTransform: 'uppercase',
    },
    body: {
      fontSize: 17, lineHeight: 1.55,
      color: '#f4f1ea',
      textWrap: 'pretty',
      animation: 'insight-rise 600ms cubic-bezier(0.16,1,0.3,1) 80ms both',
    },
    actions: {
      display: 'flex', gap: 6, marginTop: 14, paddingTop: 12,
      borderTop: '1px solid rgba(255,255,255,0.05)',
    },
    btn: {
      appearance: 'none',
      border: 'none', background: 'transparent', padding: '6px 10px',
      fontFamily: "'Departure Mono', monospace",
      fontSize: 10, letterSpacing: '0.14em', textTransform: 'lowercase',
      color: '#a8a395', cursor: 'pointer', borderRadius: 6,
      transition: 'color 200ms, background 200ms',
    },
  };

  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.head}>
        <span style={cardStyles.pip} />
        <span style={cardStyles.label}>{ins.title}</span>
        <span style={cardStyles.when}>{ins.when}</span>
      </div>
      <div style={cardStyles.body}>{ins.body}</div>
      <div style={cardStyles.actions}>
        <button style={cardStyles.btn}
                onMouseEnter={e => { e.currentTarget.style.color = '#f4f1ea'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#a8a395'; }}>
          tell me more
        </button>
        <button style={cardStyles.btn}
                onClick={onDismiss}
                onMouseEnter={e => { e.currentTarget.style.color = '#f4f1ea'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#a8a395'; }}>
          dismiss
        </button>
      </div>
    </div>
  );
}

window.InsightCard = InsightCard;
