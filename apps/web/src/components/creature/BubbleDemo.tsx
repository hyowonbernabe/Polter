'use client';
import { useEffect, useState } from 'react';

interface BubbleDemoProps {
  text: string;
  onDismiss: () => void;
}

const TAIL_SIZE = 8;

export default function BubbleDemo({ text, onDismiss }: BubbleDemoProps) {
  const [visible, setVisible] = useState(false);

  // Appear animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // 5s auto-dismiss
  useEffect(() => {
    const id = setTimeout(onDismiss, 5_000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onDismiss(); }}
      style={{
        position:        'absolute',
        bottom:          'calc(100% + 18px)',
        left:            '50%',
        width:           240,
        transform:       `translateX(-50%) scale(${visible ? 1 : 0.85})`,
        opacity:         visible ? 1 : 0,
        transition:      'transform 250ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease',
        transformOrigin: 'bottom center',
        background:      'transparent',
        border:          '1px dashed rgba(255, 255, 255, 0.22)',
        borderRadius:    12,
        padding:         '8px 12px',
        boxShadow:       'none',
        color:           'rgba(255, 255, 255, 0.65)',
        fontFamily:      'var(--font-mono)',
        fontSize:        12,
        lineHeight:      1.5,
        userSelect:      'none',
        cursor:          'pointer',
        pointerEvents:   'auto',
        zIndex:          9000,
        whiteSpace:      'normal',
        wordBreak:       'break-word',
      }}
    >
      {/* Tail */}
      <div
        style={{
          position:     'absolute',
          bottom:       -TAIL_SIZE,
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        0,
          height:       0,
          pointerEvents: 'none',
          borderLeft:   `${TAIL_SIZE}px solid transparent`,
          borderRight:  `${TAIL_SIZE}px solid transparent`,
          borderTop:    `${TAIL_SIZE}px solid rgba(255, 255, 255, 0.22)`,
        }}
      />
      <p style={{ margin: 0, fontSize: 12 }}>{text}</p>
    </div>
  );
}
