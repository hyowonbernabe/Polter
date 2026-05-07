'use client';

interface BubbleDemoProps {
  text: string;
  onDismiss: () => void;
}

export default function BubbleDemo({ text, onDismiss }: BubbleDemoProps) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onDismiss(); }}
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 10px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 220,
        background: 'var(--bg-paper)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 13,
        lineHeight: 1.45,
        color: 'var(--fg-1)',
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'normal',
        cursor: 'pointer',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        pointerEvents: 'auto',
      }}
    >
      {text}
      {/* tail */}
      <span style={{
        position: 'absolute',
        bottom: -7,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 12,
        height: 7,
        clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
        background: 'var(--bg-paper)',
      }} />
    </div>
  );
}
