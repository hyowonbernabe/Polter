import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { PolterState } from '../lib/spriteConfig';

const STATE_LABELS: Record<PolterState, string> = {
  focus: 'In Focus',
  calm:  'Calm',
  deep:  'Deep Work',
  spark: 'Sparked',
  burn:  'Burning Out',
  fade:  'Fading',
  rest:  'Resting',
};

interface Props {
  x: number;
  y: number;
  polterState: PolterState;
  sleeping: boolean;
  bubbleVisible: boolean;
  onClose: () => void;
  onDismissBubble: () => void;
}

export default function CreatureContextMenu({
  x, y, polterState, sleeping, bubbleVisible, onClose, onDismissBubble,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const MENU_W = 164;
  const clampedX = Math.min(x, window.innerWidth - MENU_W - 8);
  const clampedY = Math.min(y, window.innerHeight - 160);

  function item(label: string, onClick: () => void, danger = false) {
    return (
      <button
        key={label}
        onClick={() => { onClick(); onClose(); }}
        style={{
          display: 'block',
          width: '100%',
          padding: '6px 12px',
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          color: danger ? '#ff6b6b' : 'rgba(255,255,255,0.88)',
          fontSize: 12,
          fontFamily: 'inherit',
          cursor: 'pointer',
          borderRadius: 4,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {label}
      </button>
    );
  }

  function divider() {
    return <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '2px 0' }} />;
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: clampedX,
        top: clampedY,
        width: MENU_W,
        background: 'rgba(14,14,24,0.96)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        zIndex: 10000,
        padding: '4px 0',
        userSelect: 'none',
      }}
    >
      <div style={{
        padding: '5px 12px 6px',
        color: 'rgba(255,255,255,0.38)',
        fontSize: 11,
        fontFamily: 'inherit',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: 2,
      }}>
        {STATE_LABELS[polterState] ?? polterState}
      </div>

      {bubbleVisible && item('Dismiss bubble', onDismissBubble)}
      {bubbleVisible && divider()}
      {item('Open Dashboard', () => invoke('toggle_dashboard').catch(() => {}))}
      {item(sleeping ? 'Wake Polter' : 'Sleep', () => invoke('toggle_sleep').catch(() => {}))}
      {divider()}
      {item('Quit', () => invoke('quit_app').catch(() => {}), true)}
    </div>
  );
}
