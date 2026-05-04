import { useEffect, useRef, useState } from 'react';
import { type WispState, SPRITE_CONFIG, STATE_GLOW, ALL_STATES } from '../lib/spriteConfig';
import { type PhysicsState, type Vec2, type FacingDirection } from '../lib/physics';
import { useCreatureAnimation } from '../hooks/useCreatureAnimation';
import CreatureContextMenu from './CreatureContextMenu';

interface CreatureProps {
  displaySize: number;
  state: WispState;
  physicsState: PhysicsState;
  velocity: Vec2;
  facing: FacingDirection;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<Map<WispState, HTMLImageElement>>(new Map());
  const [spritesReady, setSpritesReady] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const anim = useCreatureAnimation(state, physicsState, velocity, facing);

  useEffect(() => { ensureKeyframes(); }, []);

  useEffect(() => {
    let loaded = 0;
    const total = ALL_STATES.length;
    for (const s of ALL_STATES) {
      const img = new Image();
      img.onload = () => {
        spritesRef.current.set(s, img);
        loaded++;
        if (loaded === total) setSpritesReady(true);
      };
      img.onerror = () => { loaded++; if (loaded === total) setSpritesReady(true); };
      img.src = new URL(`../assets/sprites/${SPRITE_CONFIG[s].file}`, import.meta.url).href;
    }
  }, []);

  // Draw canvas with horizontal flip support
  useEffect(() => {
    if (!spritesReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { frameIndex, crossfadeProgress, prevState, currentState, flip } = anim;
    const cfg = SPRITE_CONFIG[currentState];
    const w = cfg.width;
    const h = cfg.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    if (flip) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    if (prevState !== null && crossfadeProgress < 1) {
      const prevImg = spritesRef.current.get(prevState);
      if (prevImg) {
        const prevCfg = SPRITE_CONFIG[prevState];
        ctx.globalAlpha = 1 - crossfadeProgress;
        ctx.drawImage(prevImg, 0, 0, prevCfg.width, prevCfg.height, 0, 0, w, h);
      }
    }

    const curImg = spritesRef.current.get(currentState);
    if (curImg) {
      const srcX = frameIndex * w;
      ctx.globalAlpha = crossfadeProgress;
      ctx.drawImage(curImg, srcX, 0, w, h, 0, 0, w, h);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }, [anim, spritesReady]);

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

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
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
  const cfg = SPRITE_CONFIG[state];
  const scale = displaySize / cfg.width;

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
            <canvas
              ref={canvasRef}
              width={cfg.width}
              height={cfg.height}
              style={{
                imageRendering: 'pixelated',
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                cursor: physicsState === 'grabbed' ? 'grabbing' : 'grab',
                display: 'block',
              }}
            />
            {showBestSession && (
              <div style={{
                position: 'absolute', inset: 0, background: 'white',
                animation: 'best-session-flash 1.5s ease-in-out',
                pointerEvents: 'none', borderRadius: 2,
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
          onClose={() => setContextMenu(null)}
          onDismissBubble={() => { onBubbleClick?.(); setContextMenu(null); }}
        />
      )}
    </>
  );
}
