import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface MutterBubbleProps {
  text: string;
  creatureRef: React.RefObject<HTMLDivElement>;
  onDismiss: () => void;
}

const BG = 'rgba(12, 12, 20, 0.72)';
const BUBBLE_W = 220;

export default function MutterBubble({ text, creatureRef, onDismiss }: MutterBubbleProps) {
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

  // 60fps positioning loop
  useEffect(() => {
    let rafId: number;
    function tick() {
      const el = creatureRef.current;
      const bubbleEl = ref.current;
      if (el && bubbleEl) {
        const m = el.style.transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
        const cx = m ? parseFloat(m[1]) : 100;
        const cy = m ? parseFloat(m[2]) : 100;

        bubbleEl.style.left = `${cx}px`;
        bubbleEl.style.top = `${cy - 40}px`;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [creatureRef]);

  // Register bounds so click-through skips this area
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    invoke('set_bubble_bounds', { x: rect.left, y: rect.top, width: rect.width, height: rect.height }).catch(() => {});
    return () => { invoke('clear_bubble_bounds').catch(() => {}); };
  }, []); // Re-register not needed dynamically since MutterBubble bounds aren't strict

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
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
