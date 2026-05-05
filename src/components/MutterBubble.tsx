import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface MutterBubbleProps {
  text: string;
  x: number;
  y: number;
  onDismiss: () => void;
}

const BG = 'rgba(12, 12, 20, 0.72)';
const BUBBLE_W = 220;

export default function MutterBubble({ text, x, y, onDismiss }: MutterBubbleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const id = setTimeout(onDismiss, 8_000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  // Register bounds so click-through skips this area
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    invoke('set_bubble_bounds', { x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    return () => { invoke('clear_bubble_bounds'); };
  }, [x, y]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: BUBBLE_W,
        zIndex: 8900,
        background: BG,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        padding: '8px 12px',
        boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
        color: 'rgba(255,255,255,0.65)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        lineHeight: 1.5,
        userSelect: 'none',
        pointerEvents: 'auto',
        transform: visible ? 'scale(1)' : 'scale(0.88)',
        opacity: visible ? 1 : 0,
        transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), opacity 160ms ease',
        transformOrigin: 'bottom center',
      }}
    >
      {text}
    </div>
  );
}
