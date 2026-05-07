// Hero.jsx — full-bleed dark hero. The ghost drifts on its own track.

function Hero() {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => { setT((now - start) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const dy = Math.sin(t * (Math.PI * 2) / 4) * 8;

  return (
    <section style={{
      background: '#0e0f12',
      color: '#e8e6e1',
      padding: '32px 32px 96px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* subtle warm vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 70% 30%, rgba(212, 184, 122, 0.08), transparent 55%)',
        pointerEvents: 'none',
      }} />

      {/* nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 1080, margin: '0 auto 80px', position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="../../assets/ghost/front.png" className="pixel-art" style={{ width: 28, height: 28 }} alt="" />
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 22, color: '#e8e6e1' }}>polter</span>
        </div>
        <div style={{ display: 'flex', gap: 28, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a9a8a3' }}>
          <a href="#about" style={{ color: 'inherit', textDecoration: 'none' }}>about</a>
          <a href="#privacy" style={{ color: 'inherit', textDecoration: 'none' }}>privacy</a>
          <a href="#github" style={{ color: 'inherit', textDecoration: 'none' }}>github</a>
        </div>
      </nav>

      <div style={{
        maxWidth: 920, margin: '0 auto',
        display: 'grid', gridTemplateColumns: '1fr 240px', gap: 64,
        alignItems: 'center', position: 'relative', zIndex: 2,
      }}>
        <div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: '#6b6a66',
          }}>a quiet desktop companion</span>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400,
            fontSize: 84, lineHeight: 0.98, letterSpacing: '-0.03em',
            margin: '20px 0 24px', color: '#f5f4ef', textTransform: 'lowercase',
          }}>something is watching you work.</h1>
          <p style={{
            fontFamily: 'var(--font-ui)', fontSize: 19, lineHeight: 1.55,
            color: '#a9a8a3', maxWidth: 540, margin: '0 0 36px',
          }}>
            polter is a small pixel ghost that floats on your desktop. it watches how you
            work — never what you type — and occasionally tells you something true about yourself.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a href="#download" style={{
              background: '#d4b87a', color: '#1a1612',
              fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500,
              padding: '12px 22px', borderRadius: 8, textDecoration: 'none',
              transition: 'background 140ms', whiteSpace: 'nowrap',
            }}>Download for mac</a>
            <a href="#github" style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: '#a9a8a3', textDecoration: 'none',
              padding: '12px 18px',
            }}>view on github →</a>
          </div>
          <div style={{
            marginTop: 32, fontFamily: 'var(--font-mono)', fontSize: 11,
            color: '#6b6a66', letterSpacing: '0.06em',
          }}>
            macos · windows soon · everything stays on your machine
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 }}>
          <div style={{ transform: `translateY(${dy}px)`, filter: 'drop-shadow(0 0 32px rgba(245, 244, 239, 0.18))' }}>
            <img src="../../assets/ghost/front.png" className="pixel-art" style={{ width: 168, height: 168 }} alt="" />
          </div>
        </div>
      </div>
    </section>
  );
}

window.Hero = Hero;
