import { GhostSprite } from '@/components/ui/GhostSprite';

export function Footer() {
  return (
    <footer style={{ background: 'var(--bg-0)', padding: '0 clamp(24px, 6vw, 80px) var(--sp-7)' }}>
      <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: 'var(--sp-6)' }}>

        {/* Top row */}
        <div
          className="footer-top"
          style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   'var(--sp-5)',
            flexWrap:       'wrap',
            gap:            'var(--sp-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          <nav style={{ display: 'flex', gap: 'var(--sp-6)' }}>
            {[
              { label: 'GitHub',    href: 'https://github.com/polter-app/polter' },
              { label: 'Changelog', href: '#' },
              { label: 'Contact',   href: '#' },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                className="eyebrow hover:opacity-70"
                style={{ color: 'var(--fg-3)', textDecoration: 'none' }}
                {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom row */}
        <div
          className="footer-bottom"
          style={{
            display:        'flex',
            justifyContent: 'space-between',
            flexWrap:       'wrap',
            gap:            'var(--sp-3)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)' }}>
            Made by people who didn&apos;t want another app to check.
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)' }}>
            2026 · MIT licensed.
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .footer-top, .footer-bottom { flex-direction: column !important; }
        }
      `}</style>
    </footer>
  );
}
