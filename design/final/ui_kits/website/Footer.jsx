// Footer.jsx

function Footer() {
  return (
    <footer style={{
      background: '#0e0f12', color: '#a9a8a3',
      padding: '64px 32px 48px',
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 32, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="../../assets/ghost/front.png" className="pixel-art" style={{ width: 32, height: 32, opacity: 0.7 }} alt="" />
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 24, color: '#e8e6e1' }}>polter</span>
        </div>
        <div style={{
          display: 'flex', gap: 32,
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: '#6b6a66',
        }}>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>github</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>changelog</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>contact</a>
        </div>
      </div>
      <div style={{
        maxWidth: 1080, margin: '48px auto 0',
        paddingTop: 24, borderTop: '1px solid #1c1f26',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em', color: '#6b6a66',
      }}>
        <span>made by people who didn't want another app to check.</span>
        <span>© 2026 · mit licensed</span>
      </div>
    </footer>
  );
}

window.Footer = Footer;
