import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface BubbleInsightProps {
  variant: 'main';
  text: string;
  extended: string;
  isExpanded: boolean;
  isFirstEver: boolean;
  preferBelow: boolean;
  spriteSize: number;
  onDismiss: () => void;
  onExpand: () => void;
}

export interface BubbleMutterProps {
  variant: 'secondary';
  text: string;
  preferBelow: boolean;
  spriteSize: number;
  onDismiss: () => void;
}

export type BubbleProps = BubbleInsightProps | BubbleMutterProps;

const BUBBLE_W = 260;
const TAIL_SIZE = 8;
const GAP = 10;
const MAIN_BG = 'rgba(12, 12, 20, 0.82)';

export default function Bubble(props: BubbleProps) {
  const { variant, text, preferBelow, spriteSize, onDismiss } = props;
  const isMain = variant === 'main';

  const [visible, setVisible] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const buttonsRef = useRef<HTMLDivElement>(null);

  // Appear animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // 5s auto-dismiss — uses ref so prop identity doesn't affect the timer
  useEffect(() => {
    const id = setTimeout(() => onDismissRef.current(), 5_000);
    return () => clearTimeout(id);
  }, []);

  // Register button area bounds for Rust click-through (main only)
  useEffect(() => {
    if (!isMain) return;
    const el = buttonsRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    invoke('set_bubble_bounds', {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    }).catch(() => {});
    return () => {
      invoke('clear_bubble_bounds').catch(() => {});
    };
  }, [isMain, isMain && (props as BubbleInsightProps).isExpanded]);

  const isExpanded = isMain ? (props as BubbleInsightProps).isExpanded : false;
  const isFirstEver = isMain ? (props as BubbleInsightProps).isFirstEver : false;
  const extended = isMain ? (props as BubbleInsightProps).extended : undefined;
  const onExpand = isMain ? (props as BubbleInsightProps).onExpand : undefined;

  const tailColor = isMain ? MAIN_BG : 'rgba(255, 255, 255, 0.18)';

  const tailAbove: React.CSSProperties = {
    bottom: -TAIL_SIZE,
    borderLeft: `${TAIL_SIZE}px solid transparent`,
    borderRight: `${TAIL_SIZE}px solid transparent`,
    borderTop: `${TAIL_SIZE}px solid ${tailColor}`,
  };

  const tailBelow: React.CSSProperties = {
    top: -TAIL_SIZE,
    borderLeft: `${TAIL_SIZE}px solid transparent`,
    borderRight: `${TAIL_SIZE}px solid transparent`,
    borderBottom: `${TAIL_SIZE}px solid ${tailColor}`,
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: spriteSize / 2,
        ...(preferBelow ? { top: spriteSize + GAP } : { bottom: spriteSize + GAP }),
        width: BUBBLE_W,
        transform: `translateX(-50%) scale(${visible ? 1 : 0.85})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 250ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease',
        transformOrigin: preferBelow ? 'top center' : 'bottom center',
        background: isMain ? MAIN_BG : 'transparent',
        backdropFilter: isMain ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: isMain ? 'blur(16px)' : 'none' as string,
        border: isMain
          ? '1px solid rgba(255, 255, 255, 0.10)'
          : '1px dashed rgba(255, 255, 255, 0.22)',
        borderRadius: 12,
        padding: isMain ? '12px 14px 8px' : '8px 12px',
        boxShadow: isMain
          ? `0 8px 32px rgba(0,0,0,0.5)${isFirstEver ? ', 0 0 40px rgba(180,160,255,0.25)' : ''}`
          : 'none',
        color: isMain ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.65)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        lineHeight: 1.5,
        userSelect: 'none',
        pointerEvents: 'none',
        zIndex: 9000,
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      }}
    >
      {/* Tail pointing toward creature */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          pointerEvents: 'none',
          ...(preferBelow ? tailBelow : tailAbove),
        }}
      />

      <p style={{ margin: isMain ? '0 0 8px' : '0', fontSize: 12 }}>
        {text}
      </p>

      {isMain && isExpanded && extended && (
        <p
          style={{
            margin: '0 0 6px',
            fontSize: 11,
            color: 'rgba(255,255,255,0.60)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 6,
          }}
        >
          {extended}
        </p>
      )}

      {isMain && (
        <div
          ref={buttonsRef}
          style={{
            display: 'flex',
            gap: 6,
            justifyContent: 'flex-end',
            pointerEvents: 'auto',
          }}
        >
          {!isExpanded && onExpand && (
            <button onClick={onExpand} style={btnStyle('secondary')}>
              tell me more
            </button>
          )}
          <button onClick={onDismiss} style={btnStyle('primary')}>
            ok
          </button>
        </div>
      )}
    </div>
  );
}

function btnStyle(variant: 'primary' | 'secondary'): React.CSSProperties {
  return {
    background:
      variant === 'primary'
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
