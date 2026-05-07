'use client';

import { GhostSprite } from '@/components/ui/GhostSprite';

export function Navbar() {
  return (
    <nav
      className="fixed top-0 left-0 w-full z-50"
      style={{
        padding: '20px 5vw',
        background: 'linear-gradient(to bottom, rgba(14,15,18,0.85), transparent)',
        pointerEvents: 'none',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ pointerEvents: 'auto' }}
      >
        <a href="#" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
          <GhostSprite name="front.png" scale={1} />
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--fg-1)',
            }}
          >
            polter
          </span>
        </a>
        <div className="flex gap-7">
          {[
            { label: 'about', href: '#about' },
            { label: 'privacy', href: '#privacy' },
            { label: 'github', href: 'https://github.com/hyowonbernabe/Polter' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="eyebrow hover:opacity-70"
              style={{
                color: 'var(--fg-2)',
                textDecoration: 'none',
                transition: 'opacity var(--dur-quick) var(--ease-quiet)',
              }}
              {...(link.href.startsWith('http')
                ? { target: '_blank', rel: 'noreferrer' }
                : {})}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
