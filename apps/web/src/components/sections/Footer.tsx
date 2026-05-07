import { GhostSprite } from '@/components/ui/GhostSprite';

const PRODUCT_LINKS = [
  { label: 'About',      href: '#about' },
  { label: 'How It Works', href: '#about' },
  { label: 'The Science', href: '#about' },
  { label: 'Privacy',    href: '#privacy' },
];

const RESOURCE_LINKS = [
  { label: 'GitHub',     href: 'https://github.com/hyowonbernabe/Polter' },
  { label: 'Releases',   href: 'https://github.com/hyowonbernabe/Polter/releases' },
  { label: 'Issues',     href: 'https://github.com/hyowonbernabe/Polter/issues' },
  { label: 'License',    href: 'https://github.com/hyowonbernabe/Polter/blob/main/LICENSE' },
];

const CREATORS = [
  { name: 'Creator One', link: '#' },
  { name: 'Creator Two', link: '#' },
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
    <footer style={{ background: 'var(--bg-0)', padding: 'var(--sp-9) clamp(24px, 6vw, 80px) var(--sp-7)' }}>
      <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: 'var(--sp-7)' }}>

        {/* Main grid */}
        <div
          className="footer-grid"
          style={{
            display:             'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap:                 'var(--sp-8)',
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
                  fontSize:   24,
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
              Open source. Everything local.
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

          {/* Resources column */}
          <div>
            <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 'var(--sp-4)' }}>Resources</div>
            {RESOURCE_LINKS.map(link => (
              <a
                key={link.label}
                href={link.href}
                className="footer-link"
                style={linkStyle}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Creators column */}
          <div>
            <div className="eyebrow" style={{ color: 'var(--fg-3)', marginBottom: 'var(--sp-4)' }}>Created by</div>
            {CREATORS.map(creator => (
              <a
                key={creator.name}
                href={creator.link}
                className="footer-link"
                style={linkStyle}
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
            2026 &middot; MIT licensed.
          </span>
        </div>
      </div>

      <style>{`
        .footer-link:hover { color: var(--fg-1) !important; }
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
