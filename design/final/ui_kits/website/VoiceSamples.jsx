// VoiceSamples.jsx — three small bubbles, on warm paper.

function VoiceSamples() {
  const samples = [
    { t: '04:21pm', mood: 'restless', tint: '#c08a64', text: <>three context switches in the last ten minutes. <em style={{color:'#8a8980', fontStyle: 'italic'}}>your usual is one.</em></> },
    { t: '02:08pm', mood: 'calm',     tint: '#7a9e8b', text: <>your typing has settled. forty-one keystrokes a minute, steady.</> },
    { t: '11:42am', mood: 'tired',    tint: '#8e7fa8', text: <>you've come back to this file four times today.</> },
  ];

  return (
    <section style={{
      background: '#f3f1ec', color: '#1a1a18',
      padding: '120px 32px',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ marginBottom: 64, maxWidth: 640 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: '#8a8980',
          }}>what it might say</span>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400,
            fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.025em',
            margin: '16px 0 0', color: '#1a1a18', textTransform: 'lowercase',
          }}>one sentence. <span style={{color:'#8a8980'}}>maybe two.</span></h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {samples.map((s, i) => (
            <div key={i} style={{
              background: '#ebe7df',
              borderRadius: 18,
              padding: '24px 26px 20px',
              border: '1px solid #d8d4cb',
            }}>
              <div style={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: 22, lineHeight: 1.35, letterSpacing: '-0.01em',
                color: '#1a1a18', textTransform: 'lowercase',
              }}>{s.text}</div>
              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: '1px solid #d8d4cb',
                display: 'flex', alignItems: 'center', gap: 10,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: '#8a8980',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.tint }} />
                <span>{s.t}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{s.mood}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

window.VoiceSamples = VoiceSamples;
