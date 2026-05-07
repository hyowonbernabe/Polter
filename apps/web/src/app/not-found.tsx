export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-0)',
        color: 'var(--fg-2)',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        gap: 16,
        padding: 32,
        textAlign: 'center',
      }}
    >
      <span style={{ color: 'var(--fg-3)' }}>404 — not found</span>
      <a
        href="/"
        style={{
          color: 'var(--fg-2)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          textDecoration: 'none',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 16px',
        }}
      >
        go home
      </a>
    </div>
  );
}
