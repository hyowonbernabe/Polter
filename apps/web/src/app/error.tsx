'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
      <span style={{ color: 'var(--fg-3)' }}>something went wrong</span>
      <button
        onClick={reset}
        style={{
          background: 'transparent',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--fg-2)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          padding: '8px 16px',
          cursor: 'pointer',
        }}
      >
        try again
      </button>
    </div>
  );
}
