import { GhostSprite } from '@/components/ui/GhostSprite';

const PRODUCT_LINKS = [
  { label: 'About',      href: '#about' },
  { label: 'How It Works', href: '#about' },
  { label: 'The Science', href: '#about' },
  { label: 'Privacy',    href: '#privacy' },
];

const CREATORS = [
  { name: 'Hyowon Bernabe', link: 'https://www.hyowonbernabe.me' },
  { name: 'Krenz Casilen',  link: 'https://github.com/xPking23' },
];

const linkStyle: React.CSSProperties = {
  fontFamily:     'var(--font-ui)',
  fontSize:       14,
  color:          'var(--fg-2)',
  textDecoration: 'none',
  display:        'block',
  paddingBottom:  8,
  transition:     'color 0.15s ease',
};

export function Footer() {
  return (
    <footer style={{ background: 'var(--bg-0)', padding: 'var(--section-py) var(--section-px) var(--sp-7)' }}>
      <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: 'var(--sp-7)' }}>

        {/* Main grid */}
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap:                 'clamp(24px, 4vw, 48px)',
            marginBottom:        'var(--sp-8)',
          }}
        >
          {/* Brand column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--sp-4)' }}>
              <GhostSprite name="front.png" scale={1} />
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle:  'italic',
                  fontSize:   'clamp(20px, 1.2rem + 0.3vw, 24px)',
                  color:      'var(--fg-1)',
                }}
              >
                polter
              </span>
            </div>
            <p
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize:   14,
                lineHeight: 1.6,
                color:      'var(--fg-3)',
                maxWidth:   280,
                margin:     0,
              }}
            >
              A quiet desktop companion that watches how you work and tells you what it sees.
              Source available. Everything local.
            </p>
          </div>

          {/* Product column */}
          <div>
            <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 'var(--sp-4)' }}>Product</div>
            {PRODUCT_LINKS.map(link => (
              <a key={link.label} href={link.href} className="footer-link" style={linkStyle}>
                {link.label}
              </a>
            ))}
          </div>

          {/* Connect / Creators column */}
          <div>
            <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 'var(--sp-4)' }}>Connect</div>
            {CREATORS.map(creator => (
              <a
                key={creator.name}
                href={creator.link}
                className="footer-link"
                style={linkStyle}
                target="_blank"
                rel="noreferrer"
              >
                {creator.name}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop:      '1px solid var(--border-1)',
            paddingTop:     'var(--sp-4)',
            display:        'flex',
            justifyContent: 'space-between',
            flexWrap:       'wrap',
            gap:            'var(--sp-3)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)' }}>
            Boo
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)' }}>
            2026 &middot; BSL 1.1
          </span>
        </div>
      </div>

      <style>{`
        .footer-link:hover { color: var(--fg-1) !important; }
      `}</style>
    </footer>
  );
}
