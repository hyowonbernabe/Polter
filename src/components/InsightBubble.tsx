import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { TailSide } from '../lib/bubblePosition';

export interface InsightBubbleProps {
  insight: string;
  extended: string;
  x: number;
  y: number;
  tailSide: TailSide;
  onDismiss: () => void;
  onExpand: () => void;
  isExpanded: boolean;
  isFirstEver: boolean;
}

const BG = 'rgba(12, 12, 20, 0.78)';
const BORDER = '1px solid rgba(255,255,255,0.10)';
const BUBBLE_W = 300;

function TailShape({ side }: { side: TailSide }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    pointerEvents: 'none',
    left: '50%',
    transform: 'translateX(-50%)',
  };

  if (side === 'bottom') {
    return <div style={{
      ...base,
      bottom: -10,
      borderLeft: '10px solid transparent',
      borderRight: '10px solid transparent',
      borderTop: `10px solid ${BG}`,
    }} />;
  }
  return <div style={{
    ...base,
    top: -10,
    borderLeft: '10px solid transparent',
    borderRight: '10px solid transparent',
    borderBottom: `10px solid ${BG}`,
  }} />;
}

export default function InsightBubble({
  insight, extended, x, y, tailSide, onDismiss, onExpand, isExpanded, isFirstEver,
}: InsightBubbleProps) {
  const [visible, setVisible] = useState(false);

  // Bloom in after mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Auto-dismiss after 45 seconds
  useEffect(() => {
    const id = setTimeout(onDismiss, 45_000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  // Register bubble bounds so the click-through loop captures pointer events over the bubble.
  // Re-registers when position or expanded state changes; clears on unmount.
  useEffect(() => {
    const h = isExpanded ? 260 : 180;
    invoke('set_bubble_bounds', { x, y, width: BUBBLE_W, height: h });
    return () => { invoke('clear_bubble_bounds'); };
  }, [x, y, isExpanded]);

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: BUBBLE_W,
        zIndex: 9000,
        background: BG,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: BORDER,
        borderRadius: 14,
        padding: '14px 16px 8px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5)${isFirstEver ? ', 0 0 40px rgba(180,160,255,0.25)' : ''}`,
        color: 'rgba(255,255,255,0.90)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        lineHeight: 1.5,
        userSelect: 'none',
        transform: visible ? 'scale(1)' : 'scale(0.82)',
        opacity: visible ? 1 : 0,
        transition: 'transform 280ms cubic-bezier(0.34,1.56,0.64,1), opacity 220ms ease',
        transformOrigin: tailSide === 'bottom' ? 'bottom center' : 'top center',
      }}
    >
      <TailShape side={tailSide} />

      <p style={{ margin: '0 0 10px', fontSize: 13 }}>{insight}</p>

      {isExpanded && (
        <p style={{
          margin: '0 0 6px',
          fontSize: 12,
          color: 'rgba(255,255,255,0.65)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 8,
        }}>
          {extended}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {!isExpanded && (
          <button onClick={onExpand} style={btnStyle('secondary')}>
            tell me more
          </button>
        )}
        <button onClick={onDismiss} style={btnStyle('primary')}>
          ok
        </button>
      </div>
    </div>
  );
}

function btnStyle(variant: 'primary' | 'secondary'): React.CSSProperties {
  return {
    background: variant === 'primary'
      ? 'rgba(255,255,255,0.14)'
      : 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    padding: '4px 12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '0.02em',
    transition: 'background 150ms ease',
  };
}
