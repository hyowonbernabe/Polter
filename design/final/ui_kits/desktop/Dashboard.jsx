// Dashboard.jsx — patterns over time.
// Single column, generous margins, no top nav, no sidebar.

function StatTile({ label, value, unit, delta, deltaTone = 'up', spark }) {
  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border-1)',
      borderRadius: 12,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{label}</span>
      <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 38, lineHeight: 1, color: 'var(--fg-1)' }}>
        {value}
        {unit && <span style={{ fontFamily: 'var(--font-ui)', fontStyle: 'normal', fontSize: 14, color: 'var(--fg-3)', marginLeft: 6 }}>{unit}</span>}
      </div>
      {delta && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: deltaTone === 'down' ? '#c08a64' : '#7a9e8b', letterSpacing: '0.06em' }}>{delta}</span>
      )}
      {spark && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, marginTop: 'auto' }}>
          {spark.map((h, i) => (
            <span key={i} style={{
              width: 5,
              height: h,
              background: i === spark.length - 1 ? '#d4b87a' : 'rgba(212,184,122,0.45)',
              borderRadius: 1,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

function MoodTimeline({ entries }) {
  // entries: [{hour, mood}]
  const colors = window.GHOST_MOOD_TINT;
  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border-1)',
      borderRadius: 12,
      padding: '24px 24px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>today · mood timeline</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)' }}>9am — 6pm</span>
      </div>
      <div style={{ display: 'flex', gap: 2, height: 56, borderRadius: 4, overflow: 'hidden' }}>
        {entries.map((e, i) => (
          <div key={i} title={`${e.hour} · ${e.mood}`} style={{
            flex: 1,
            background: colors[e.mood],
            opacity: e.mood === 'asleep' ? 0.35 : (e.mood === 'tired' ? 0.6 : 0.85),
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        {['9', '10', '11', '12', '1', '2', '3', '4', '5'].map(h => (
          <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)' }}>{h}</span>
        ))}
      </div>
    </div>
  );
}

function ObservationLog({ items }) {
  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border-1)',
      borderRadius: 12,
      padding: '8px 0',
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          padding: '14px 22px',
          borderBottom: i === items.length - 1 ? 'none' : '1px solid var(--border-1)',
          display: 'flex',
          gap: 18,
          alignItems: 'flex-start',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--fg-3)', minWidth: 64, paddingTop: 4,
          }}>{it.time}</span>
          <span style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 16,
            color: 'var(--fg-1)', lineHeight: 1.4, textTransform: 'lowercase',
          }}>{it.text}</span>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ onClose }) {
  const moodEntries = [
    { hour: '9am', mood: 'calm' }, { hour: '10am', mood: 'calm' },
    { hour: '11am', mood: 'restless' }, { hour: '12pm', mood: 'restless' },
    { hour: '1pm', mood: 'asleep' }, { hour: '2pm', mood: 'calm' },
    { hour: '3pm', mood: 'calm' }, { hour: '4pm', mood: 'tired' },
    { hour: '5pm', mood: 'tired' },
  ];
  const observations = [
    { time: '04:21pm', text: "you've come back to this file four times today." },
    { time: '02:08pm', text: 'a long uninterrupted block. forty-three minutes.' },
    { time: '11:42am', text: 'your typing slowed around now. it usually does.' },
    { time: '09:14am', text: 'you opened seven tabs in the first minute.' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg-1)',
      overflow: 'auto',
      zIndex: 50,
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 32px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="../../assets/ghost/front.png" className="pixel-art" style={{ width: 32, height: 32 }} alt="" />
            <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 24, color: 'var(--fg-1)' }}>polter</span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 0, color: 'var(--fg-3)',
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
            textTransform: 'uppercase', cursor: 'pointer', padding: 8,
          }}>close · esc</button>
        </div>

        <div style={{ marginBottom: 40 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>tuesday, may 5</span>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400,
            fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.025em', color: 'var(--fg-1)',
            margin: '12px 0 0', textTransform: 'lowercase',
          }}>a quiet, focused morning. a restless afternoon.</h1>
        </div>

        <MoodTimeline entries={moodEntries} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
          <StatTile label="focus blocks" value="3" unit="today" delta="— up from your usual 2" spark={[12, 18, 14, 22, 30]} />
          <StatTile label="keystrokes" value="38" unit="/min · steady" delta="— close to baseline" spark={[14, 18, 22, 26, 24, 28]} />
          <StatTile label="context switches" value="2.4" unit="/hour" delta="— up 30% this week" deltaTone="down" spark={[14, 12, 18, 22, 24, 30]} />
        </div>

        <div style={{ marginTop: 40 }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>today's observations</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)' }}>4 of 4</span>
          </div>
          <ObservationLog items={observations} />
        </div>

        <div style={{
          marginTop: 64,
          paddingTop: 32,
          borderTop: '1px solid var(--border-1)',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)',
          letterSpacing: '0.06em',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>everything stays on this machine. nothing is uploaded.</span>
          <span>raw events · never stored</span>
        </div>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
window.StatTile = StatTile;
