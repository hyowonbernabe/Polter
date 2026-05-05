import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getBubblePosition, type TailSide } from '../lib/bubblePosition';
import type { MonitorInfo } from '../hooks/useCreaturePosition';

export interface InsightBubbleProps {
  insight: string;
  extended: string;
  creatureRef: React.RefObject<HTMLDivElement>;
  monitors: MonitorInfo[];
  spriteSize: number;
  onDismiss: () => void;
  onExpand: () => void;
  isExpanded: boolean;
  isFirstEver: boolean;
}

const BG = 'rgba(12, 12, 20, 0.78)';
const BORDER = '1px solid rgba(255,255,255,0.10)';
const BUBBLE_W = 300;

export default function InsightBubble({
  insight, extended, creatureRef, monitors, spriteSize, onDismiss, onExpand, isExpanded, isFirstEver,
}: InsightBubbleProps) {
  const [visible, setVisible] = useState(false);
  const [tailSideState, setTailSideState] = useState<TailSide>('bottom');
  const bubbleRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const id = setTimeout(onDismiss, 45_000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  // 60fps positioning loop
  useEffect(() => {
    let rafId: number;
    function tick() {
      const el = creatureRef.current;
      const bubbleEl = bubbleRef.current;
      if (el && bubbleEl) {
        const m = el.style.transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
        const cx = m ? parseFloat(m[1]) : 100;
        const cy = m ? parseFloat(m[2]) : 100;

        const bp = getBubblePosition(
          cx, cy, spriteSize, spriteSize,
          monitors, BUBBLE_W, window.innerHeight,
        );

        bubbleEl.style.left = `${bp.x}px`;
        if (bp.tailSide === 'bottom') {
          bubbleEl.style.bottom = `${bp.y}px`;
          bubbleEl.style.top = 'auto';
          bubbleEl.style.transformOrigin = 'bottom center';
        } else {
          bubbleEl.style.top = `${bp.y}px`;
          bubbleEl.style.bottom = 'auto';
          bubbleEl.style.transformOrigin = 'top center';
        }

        if (tailRef.current) {
          tailRef.current.style.left = `${bp.tailOffset}px`;
        }
        
        setTailSideState(prev => prev !== bp.tailSide ? bp.tailSide : prev);
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [creatureRef, monitors, spriteSize]);

  useEffect(() => {
    const el = bubbleRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    invoke('set_bubble_bounds', { x: rect.left, y: rect.top, width: rect.width, height: rect.height }).catch(() => {});
    return () => { invoke('clear_bubble_bounds').catch(() => {}); };
  }, [isExpanded, tailSideState]); // Re-register bounds when expanded or flipped

  const tailBase: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    pointerEvents: 'none',
    transform: 'translateX(-50%)',
  };

  return (
    <div
      ref={bubbleRef}
      style={{
        position: 'fixed',
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
      }}
    >
      <div
        ref={tailRef}
        style={{
          ...tailBase,
          ...(tailSideState === 'bottom'
            ? { bottom: -10, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: `10px solid ${BG}` }
            : { top: -10, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: `10px solid ${BG}` }
          )
        }}
      />

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
