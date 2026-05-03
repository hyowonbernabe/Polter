// Dashboard.jsx — larger frosted-glass panel summoned by clicking the wisp.
// Three sections: a state strip, a week chart, and recent notes.

function Dashboard({ state, onClose }) {
  const s = window.WISP_DATA.STATES[state];
  const days = window.WISP_DATA.DASHBOARD_DAYS;
  const notes = window.WISP_DATA.DASHBOARD_NOTES;
  const max = Math.max(...days.map(d => d.focus + d.deep + d.burn));

  const dashStyles = {
    panel: {
      width: 480,
      padding: '24px 24px 22px',
      borderRadius: 14,
      background: 'rgba(17,20,29,0.88)',
      backdropFilter: 'blur(28px) saturate(140%)',
      WebkitBackdropFilter: 'blur(28px) saturate(140%)',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow:
        '0 32px 80px -8px rgba(0,0,0,0.75),' +
        '0 6px 24px -4px rgba(0,0,0,0.5),' +
        'inset 0 1px 0 rgba(255,255,255,0.04)',
      animation: 'panel-bloom-in 320ms cubic-bezier(0.16,1,0.3,1) both',
      color: '#f4f1ea',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    head: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 },
    pip: { width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 10px ${s.glow}` },
    label: {
      fontFamily: "'Departure Mono', monospace",
      fontSize: 11, letterSpacing: '0.16em',
      color: '#cfcabd', textTransform: 'lowercase',
    },
    titleBar: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 },
    iconBtn: {
      width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 8, background: 'transparent', border: 'none', color: '#a8a395', cursor: 'pointer',
      transition: 'color 200ms, background 200ms',
    },
    sectionHead: {
      fontFamily: "'Departure Mono', monospace",
      fontSize: 10, letterSpacing: '0.16em',
      color: '#6f6c63', textTransform: 'lowercase',
      marginBottom: 10,
    },
    section: { marginBottom: 18 },
    chart: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 8,
      alignItems: 'end',
      height: 100,
      padding: '0 2px',
    },
    barCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
    barStack: {
      width: 18, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      gap: 2, height: 80,
    },
    barLabel: {
      fontFamily: "'Departure Mono', monospace",
      fontSize: 9, letterSpacing: '0.14em', color: '#6f6c63', textTransform: 'lowercase',
    },
    note: {
      display: 'flex', gap: 14, padding: '10px 0',
      borderTop: '1px solid rgba(255,255,255,0.04)',
    },
    noteWhen: {
      fontFamily: "'Departure Mono', monospace",
      fontSize: 10, letterSpacing: '0.14em',
      color: '#6f6c63', textTransform: 'uppercase',
      width: 84, flex: 'none', paddingTop: 1,
    },
    noteText: { fontSize: 14, lineHeight: 1.5, color: '#cfcabd', textWrap: 'pretty' },
    summary: {
      display: 'flex', gap: 24, marginBottom: 18,
      paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.04)',
    },
    metric: { display: 'flex', flexDirection: 'column', gap: 4 },
    metricVal: {
      fontFamily: "'Departure Mono', monospace",
      fontSize: 22, letterSpacing: '0.06em', color: '#f4f1ea',
    },
    metricLbl: {
      fontFamily: "'Departure Mono', monospace",
      fontSize: 10, letterSpacing: '0.14em', color: '#6f6c63', textTransform: 'lowercase',
    },
  };

  const totalFocus = days.reduce((a, b) => a + b.focus + b.deep, 0);
  const totalBurn = days.reduce((a, b) => a + b.burn, 0);
  const hours = (m) => `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`;

  return (
    <div style={dashStyles.panel}>
      <div style={dashStyles.head}>
        <span style={dashStyles.pip} />
        <span style={dashStyles.label}>{s.label}</span>
        <div style={dashStyles.titleBar}>
          <button style={dashStyles.iconBtn} aria-label="settings"
                  onMouseEnter={e=>{e.currentTarget.style.color='#f4f1ea';e.currentTarget.style.background='rgba(255,255,255,0.05)';}}
                  onMouseLeave={e=>{e.currentTarget.style.color='#a8a395';e.currentTarget.style.background='transparent';}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button style={dashStyles.iconBtn} aria-label="sleep"
                  onMouseEnter={e=>{e.currentTarget.style.color='#f4f1ea';e.currentTarget.style.background='rgba(255,255,255,0.05)';}}
                  onMouseLeave={e=>{e.currentTarget.style.color='#a8a395';e.currentTarget.style.background='transparent';}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
          <button style={dashStyles.iconBtn} aria-label="close" onClick={onClose}
                  onMouseEnter={e=>{e.currentTarget.style.color='#f4f1ea';e.currentTarget.style.background='rgba(255,255,255,0.05)';}}
                  onMouseLeave={e=>{e.currentTarget.style.color='#a8a395';e.currentTarget.style.background='transparent';}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={dashStyles.summary}>
        <div style={dashStyles.metric}>
          <span style={dashStyles.metricVal}>{hours(totalFocus)}</span>
          <span style={dashStyles.metricLbl}>focused this week</span>
        </div>
        <div style={dashStyles.metric}>
          <span style={dashStyles.metricVal}>{hours(totalBurn)}</span>
          <span style={dashStyles.metricLbl}>burning</span>
        </div>
        <div style={dashStyles.metric}>
          <span style={dashStyles.metricVal}>43m</span>
          <span style={dashStyles.metricLbl}>longest hold</span>
        </div>
      </div>

      <div style={dashStyles.section}>
        <div style={dashStyles.sectionHead}>last seven days</div>
        <div style={dashStyles.chart}>
          {days.map((d, i) => {
            const total = d.focus + d.deep + d.burn;
            const h = (n) => `${(n / max) * 80}px`;
            return (
              <div key={i} style={dashStyles.barCol}>
                <div style={dashStyles.barStack}>
                  {d.burn  > 0 && <div style={{ height: h(d.burn),  background: '#e89466', opacity: 0.85, borderRadius: 1, boxShadow: '0 0 6px rgba(232,148,102,0.4)' }} />}
                  {d.deep  > 0 && <div style={{ height: h(d.deep),  background: '#9b7fe0', opacity: 0.85, borderRadius: 1, boxShadow: '0 0 6px rgba(155,127,224,0.4)' }} />}
                  {d.focus > 0 && <div style={{ height: h(d.focus), background: '#6fb6d9', opacity: 0.85, borderRadius: 1, boxShadow: '0 0 6px rgba(111,182,217,0.4)' }} />}
                </div>
                <span style={dashStyles.barLabel}>{d.d}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={dashStyles.section}>
        <div style={dashStyles.sectionHead}>recent notes</div>
        {notes.map((n, i) => (
          <div key={i} style={dashStyles.note}>
            <span style={dashStyles.noteWhen}>{n.when}</span>
            <span style={dashStyles.noteText}>{n.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
