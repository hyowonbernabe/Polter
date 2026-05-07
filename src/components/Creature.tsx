import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { type WispState, STATE_GLOW } from '../lib/spriteConfig';
import { type PhysicsState, type Vec2, type FacingDirection } from '../lib/physics';
import { useCreatureAnimation } from '../hooks/useCreatureAnimation';
import CreatureContextMenu from './CreatureContextMenu';
import Bubble, { type BubbleProps } from './Bubble';

export interface ActiveInsight {
  text: string;
  extended: string;
  isFirstEver: boolean;
  isExpanded: boolean;
  onDismiss: () => void;
  onExpand: () => void;
}

export interface ActiveMutter {
  text: string;
  onDismiss: () => void;
}

interface CreatureProps {
  displaySize: number;
  state: WispState;
  physicsState: PhysicsState;
  velocity: Vec2;
  facing: FacingDirection;
  committedDir: number;
  dragSquish: Vec2;
  coldStart: boolean;
  opacity?: number;
  showReturning?: boolean;
  showBestSession?: boolean;
  burnDistress?: boolean;
  sleeping?: boolean;
  privacyMode?: boolean;
  showWake?: boolean;
  preInsightPhase?: 0 | 1 | 2 | 3;
  isFirstEverInsight?: boolean;
  showNod?: boolean;
  bubbleVisible?: boolean;
  activeInsight?: ActiveInsight | null;
  activeMutter?: ActiveMutter | null;
  elementRef: React.RefObject<HTMLDivElement>;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onBubbleClick?: () => void;
  onReturningDone?: () => void;
  onBestSessionDone?: () => void;
  onWakeDone?: () => void;
  onNodDone?: () => void;
  debugMode?: boolean;
}

function ensureKeyframes() {
  if (document.getElementById('wisp-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'wisp-keyframes';
  style.textContent = `
    @keyframes breathe {
      0%, 100% { transform: scale(1.0); }
      50%       { transform: scale(1.06); }
    }
    @keyframes breathe-sleep {
      0%, 100% { transform: scale(1.0); }
      50%       { transform: scale(1.015); }
    }
    @keyframes tremble {
      0%, 100% { transform: translateX(0); }
      25%      { transform: translateX(-2px); }
      75%      { transform: translateX(2px); }
    }
    @keyframes returning-bounce {
      0%   { transform: scale(0.9); }
      50%  { transform: scale(1.05); }
      100% { transform: scale(1.0); }
    }
    @keyframes best-session-flash {
      0%, 100% { opacity: 0; }
      50%      { opacity: 0.6; }
    }
    @keyframes wake-unfurl {
      0%   { transform: scale(0.7);  opacity: 0.3; }
      60%  { transform: scale(1.12); opacity: 1.0; }
      100% { transform: scale(1.0);  opacity: 1.0; }
    }
    @keyframes pre-glow-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.7; }
    }
    @keyframes nod {
      0%   { transform: translateY(0); }
      35%  { transform: translateY(5px); }
      100% { transform: translateY(0); }
    }
    @keyframes land-squash {
      0%   { transform: scaleX(1.2) scaleY(0.7); }
      60%  { transform: scaleX(0.95) scaleY(1.05); }
      100% { transform: scaleX(1) scaleY(1); }
    }
    @keyframes stun-spin {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default function Creature({
  displaySize,
  state,
  physicsState,
  velocity,
  facing,
  committedDir,
  dragSquish,
  coldStart,
  opacity = 1.0,
  showReturning = false,
  showBestSession = false,
  burnDistress = false,
  sleeping = false,
  privacyMode = false,
  showWake = false,
  preInsightPhase = 0,
  isFirstEverInsight = false,
  showNod = false,
  bubbleVisible = false,
  activeInsight = null,
  activeMutter = null,
  debugMode = false,
  elementRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClick,
  onBubbleClick,
  onReturningDone,
  onBestSessionDone,
  onWakeDone,
  onNodDone,
}: CreatureProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const { spritePath, flip } = useCreatureAnimation(state, physicsState, velocity, facing, committedDir);

  useEffect(() => { ensureKeyframes(); }, []);

  useEffect(() => {
    if (!showReturning) return;
    const id = setTimeout(() => onReturningDone?.(), 600);
    return () => clearTimeout(id);
  }, [showReturning, onReturningDone]);

  useEffect(() => {
    if (!showBestSession) return;
    const id = setTimeout(() => onBestSessionDone?.(), 1500);
    return () => clearTimeout(id);
  }, [showBestSession, onBestSessionDone]);

  useEffect(() => {
    if (!showWake) return;
    const id = setTimeout(() => onWakeDone?.(), 800);
    return () => clearTimeout(id);
  }, [showWake, onWakeDone]);

  useEffect(() => {
    if (!showNod) return;
    const id = setTimeout(() => onNodDone?.(), 420);
    return () => clearTimeout(id);
  }, [showNod, onNodDone]);

  // Determine if bubble should appear below creature (creature is near top of screen)
  function getPreferBelow(): boolean {
    const el = elementRef.current;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.35;
  }

  const MENU_W = 164;
  const MENU_H = 180;

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const mx = Math.min(e.clientX, window.innerWidth  - MENU_W - 8);
    const my = Math.min(e.clientY, window.innerHeight - MENU_H);
    setContextMenu({ x: e.clientX, y: e.clientY });
    invoke('set_bubble_bounds', { x: mx, y: my, width: MENU_W, height: MENU_H }).catch(() => {});
  }

  function closeContextMenu() {
    setContextMenu(null);
    invoke('clear_bubble_bounds').catch(() => {});
  }

  function handleClick(e: React.MouseEvent) {
    if (bubbleVisible) {
      onBubbleClick?.();
      return;
    }
    onClick(e);
  }

  let glowFilter: string;
  if (privacyMode) {
    glowFilter = 'grayscale(1) brightness(0.45)';
  } else if (sleeping) {
    glowFilter = 'saturate(0.12) brightness(0.38)';
  } else if (preInsightPhase === 2) {
    const intensity = isFirstEverInsight ? '28px' : '20px';
    glowFilter = `drop-shadow(0 0 ${intensity} #c8b0ff) brightness(1.25)`;
  } else if (preInsightPhase === 1) {
    const intensity = isFirstEverInsight ? '18px' : '12px';
    glowFilter = `drop-shadow(0 0 ${intensity} #b090ff) brightness(1.15)`;
  } else if (showReturning) {
    glowFilter = 'drop-shadow(0 0 20px #ffffff)';
  } else if (burnDistress) {
    glowFilter = 'drop-shadow(0 0 14px #ff2200)';
  } else if (coldStart) {
    glowFilter = `saturate(0.3) ${STATE_GLOW.cold_start}`;
  } else {
    glowFilter = STATE_GLOW[state];
  }

  const outerAnimation =
    physicsState === 'stunned'     ? 'stun-spin 0.4s linear infinite' :
    physicsState === 'land_impact' ? 'land-squash 0.3s ease-out' :
    showNod        ? 'nod 0.42s ease-in-out' :
    showWake       ? 'wake-unfurl 0.8s ease-out' :
    showReturning  ? 'returning-bounce 0.6s ease-in-out' :
    preInsightPhase === 2 ? 'pre-glow-pulse 0.8s ease-in-out' :
    sleeping       ? 'breathe-sleep 8s ease-in-out infinite' :
    'breathe 3s ease-in-out infinite';

  const effectiveOpacity = sleeping ? Math.min(opacity, 0.45) : opacity;

  const preferBelow = getPreferBelow();

  const insightBubbleProps: BubbleProps | null = activeInsight
    ? {
        variant: 'main',
        text: activeInsight.text,
        extended: activeInsight.extended,
        isExpanded: activeInsight.isExpanded,
        isFirstEver: activeInsight.isFirstEver,
        preferBelow,
        spriteSize: displaySize,
        onDismiss: activeInsight.onDismiss,
        onExpand: activeInsight.onExpand,
      }
    : null;

  const mutterBubbleProps: BubbleProps | null = activeMutter
    ? {
        variant: 'secondary',
        text: activeMutter.text,
        preferBelow,
        spriteSize: displaySize,
        onDismiss: activeMutter.onDismiss,
      }
    : null;

  return (
    <>
      {/* Physics position wrapper — physics loop writes transform here */}
      <div
        ref={elementRef}
        style={{ position: 'fixed', left: 0, top: 0, willChange: 'transform' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
      >
        {insightBubbleProps && (
          <Bubble key={activeInsight!.text} {...insightBubbleProps} />
        )}
        {mutterBubbleProps && (
          <Bubble key={activeMutter!.text} {...mutterBubbleProps} />
        )}

        {/* Visual / animation layer */}
        <div
          style={{
            width: displaySize,
            height: displaySize,
            filter: glowFilter,
            transition: 'filter 500ms ease, opacity 2s ease',
            animation: outerAnimation,
            opacity: effectiveOpacity,
            transform: `scaleX(${dragSquish.x}) scaleY(${dragSquish.y})`,
            transformOrigin: 'center center',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              animation: burnDistress ? 'tremble 0.15s ease-in-out infinite' : undefined,
            }}
          >
            <img
              src={spritePath}
              alt=""
              draggable={false}
              style={{
                width: displaySize,
                height: displaySize,
                imageRendering: 'pixelated',
                transform: flip ? 'scaleX(-1)' : 'none',
                transformOrigin: 'center center',
                cursor: (physicsState === 'grabbed' || physicsState === 'tether_grab') ? 'grabbing' : 'grab',
                display: 'block',
                userSelect: 'none',
              }}
            />
            {showBestSession && (
              <div style={{
                position: 'absolute', inset: 0, background: 'white',
                animation: 'best-session-flash 1.5s ease-in-out',
                pointerEvents: 'none', borderRadius: 2,
              }} />
            )}
            {debugMode && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(255, 30, 30, 0.25)',
                outline: '1px solid rgba(255, 30, 30, 0.9)',
                pointerEvents: 'none',
              }} />
            )}
          </div>
        </div>
      </div>

      {contextMenu && (
        <CreatureContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          wispState={state}
          sleeping={sleeping ?? false}
          bubbleVisible={bubbleVisible}
          onClose={closeContextMenu}
          onDismissBubble={() => { onBubbleClick?.(); closeContextMenu(); }}
        />
      )}
    </>
  );
}
