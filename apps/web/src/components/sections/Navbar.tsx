'use client';

import { useState } from 'react';
import { GhostSprite } from '@/components/ui/GhostSprite';

const LINKS = [
  { label: 'About',   href: '#about' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'GitHub',  href: 'https://github.com/hyowonbernabe/Polter' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 w-full z-50"
      style={{
        padding: '20px var(--section-px)',
        background: 'linear-gradient(to bottom, rgba(14,15,18,0.85), transparent)',
        pointerEvents: 'none',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ pointerEvents: 'auto', maxWidth: 'var(--content-max)', margin: '0 auto' }}
      >
        <a href="#" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
          <GhostSprite name="front.png" scale={1} />
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(18px, 1rem + 0.5vw, 22px)',
              color: 'var(--fg-1)',
            }}
          >
            polter
          </span>
        </a>

        {/* Desktop links */}
        <div className="nav-links-desktop" style={{ display: 'flex', gap: 'clamp(16px, 3vw, 28px)' }}>
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="eyebrow nav-link"
              style={{
                color: 'var(--fg-2)',
                textDecoration: 'none',
                transition: 'color var(--dur-quick) var(--ease-quiet)',
              }}
              {...(link.href.startsWith('http')
                ? { target: '_blank', rel: 'noreferrer' }
                : {})}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Hamburger button — visible only on small screens */}
        <button
          className="nav-hamburger"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--fg-2)" strokeWidth="1.5" strokeLinecap="round">
            {open ? (
              <>
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </>
            ) : (
              <>
                <line x1="3" y1="5" x2="17" y2="5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className="nav-drawer"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-4)',
            padding: 'var(--sp-5) 0',
            maxWidth: 'var(--content-max)',
            margin: '0 auto',
          }}
        >
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="eyebrow nav-link"
              onClick={() => setOpen(false)}
              style={{
                color: 'var(--fg-2)',
                textDecoration: 'none',
                fontSize: 'var(--fs-sm)',
                transition: 'color var(--dur-quick) var(--ease-quiet)',
              }}
              {...(link.href.startsWith('http')
                ? { target: '_blank', rel: 'noreferrer' }
                : {})}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 480px) {
          .nav-links-desktop { display: none !important; }
          .nav-hamburger { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
