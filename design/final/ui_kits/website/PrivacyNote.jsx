// PrivacyNote.jsx — the "what we never see" section.

function PrivacyNote() {
  const yes = [
    'keystroke timing — when, not what',
    'mouse path and idle gaps',
    'window switches and focus durations',
    'time of day and day of week',
  ];
  const no = [
    'the words you type',
    'the websites you visit',
    'the contents of your screen',
    'anything sent to a server',
  ];

  return (
    <section id="privacy" style={{
      background: '#ebe7df', color: '#1a1a18',
      padding: '120px 32px',
    }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#8a8980',
        }}>privacy</span>
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400,
          fontSize: 48, lineHeight: 1.1, letterSpacing: '-0.025em',
          margin: '16px 0 56px', color: '#1a1a18', textTransform: 'lowercase',
          maxWidth: 720,
        }}>everything stays on your machine. <span style={{color:'#8a8980'}}>nothing is uploaded. no account.</span></h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a9e8b' }}>what polter sees</span>
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0' }}>
              {yes.map((y, i) => (
                <li key={i} style={{
                  fontFamily: 'var(--font-ui)', fontSize: 16, lineHeight: 1.5,
                  color: '#1a1a18', padding: '14px 0',
                  borderBottom: '1px solid #d8d4cb',
                }}>{y}</li>
              ))}
            </ul>
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b86a5e' }}>what polter never sees</span>
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0' }}>
              {no.map((y, i) => (
                <li key={i} style={{
                  fontFamily: 'var(--font-ui)', fontSize: 16, lineHeight: 1.5,
                  color: '#4a4a45', padding: '14px 0',
                  borderBottom: '1px solid #d8d4cb',
                  textDecoration: 'line-through',
                  textDecorationColor: '#b86a5e88',
                }}>{y}</li>
              ))}
            </ul>
          </div>
        </div>

        <p style={{
          fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: 1.7,
          color: '#4a4a45', marginTop: 48, maxWidth: 640,
        }}>
          polter learns your baseline by watching patterns over weeks. the raw events are
          discarded. only the rhythm remains. you can delete that rhythm any time.
        </p>
      </div>
    </section>
  );
}

window.PrivacyNote = PrivacyNote;
