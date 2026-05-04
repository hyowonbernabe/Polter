import { useEffect, useRef, useState } from 'react';
import { type WispState, SPRITE_CONFIG, STATE_GLOW, ALL_STATES } from '../lib/spriteConfig';
import { useCreatureAnimation } from '../hooks/useCreatureAnimation';

const SCALE = 4;

interface CreatureProps {
  x: number;
  y: number;
  onPositionChange: (x: number, y: number) => void;
  state: WispState;
  coldStart: boolean;
  opacity?: number;
  showReturning?: boolean;
  showBestSession?: boolean;
  burnDistress?: boolean;
  onReturningDone?: () => void;
  onBestSessionDone?: () => void;
}

function ensureKeyframes() {
  if (document.getElementById('wisp-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'wisp-keyframes';
  style.textContent = `
    @keyframes breathe {
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
  `;
  document.head.appendChild(style);
}

export default function Creature({
  x,
  y,
  onPositionChange,
  state,
  coldStart,
  opacity = 1.0,
  showReturning = false,
  showBestSession = false,
  burnDistress = false,
  onReturningDone,
  onBestSessionDone,
}: CreatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<Map<WispState, HTMLImageElement>>(new Map());
  const [spritesReady, setSpritesReady] = useState(false);

  const anim = useCreatureAnimation(state);

  useEffect(() => {
    ensureKeyframes();
  }, []);

  // Preload all 7 sprites on mount
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
      img.onerror = () => {
        loaded++;
        if (loaded === total) setSpritesReady(true);
      };
      img.src = new URL(`../assets/sprites/${SPRITE_CONFIG[s].file}`, import.meta.url).href;
    }
  }, []);

  // Draw canvas whenever animation state or sprites change
  useEffect(() => {
    if (!spritesReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { frameIndex, crossfadeProgress, prevState, currentState } = anim;
    const cfg = SPRITE_CONFIG[currentState];
    const w = cfg.width;
    const h = cfg.height;

    ctx.clearRect(0, 0, w, h);

    // Draw outgoing sprite during crossfade
    if (prevState !== null && crossfadeProgress < 1) {
      const prevImg = spritesRef.current.get(prevState);
      if (prevImg) {
        const prevCfg = SPRITE_CONFIG[prevState];
        ctx.globalAlpha = 1 - crossfadeProgress;
        ctx.drawImage(prevImg, 0, 0, prevCfg.width, prevCfg.height, 0, 0, w, h);
      }
    }

    // Draw current sprite
    const curImg = spritesRef.current.get(currentState);
    if (curImg) {
      const srcX = frameIndex * w;
      ctx.globalAlpha = crossfadeProgress;
      ctx.drawImage(curImg, srcX, 0, w, h, 0, 0, w, h);
    }

    ctx.globalAlpha = 1;
  }, [anim, spritesReady]);

  // Auto-clear returning animation after 600ms
  useEffect(() => {
    if (!showReturning) return;
    const id = setTimeout(() => onReturningDone?.(), 600);
    return () => clearTimeout(id);
  }, [showReturning, onReturningDone]);

  // Auto-clear best-session animation after 1500ms
  useEffect(() => {
    if (!showBestSession) return;
    const id = setTimeout(() => onBestSessionDone?.(), 1500);
    return () => clearTimeout(id);
  }, [showBestSession, onBestSessionDone]);

  // Drag logic (preserved from original)
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - x, y: e.clientY - y };
    e.preventDefault();
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      onPositionChange(e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y);
    }
    function onMouseUp() {
      dragging.current = false;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onPositionChange]);

  // Glow filter: returning takes priority, then burn distress, then cold start, then normal
  let glowFilter: string;
  if (showReturning) {
    glowFilter = 'drop-shadow(0 0 20px #ffffff)';
  } else if (burnDistress) {
    glowFilter = 'drop-shadow(0 0 14px #ff2200)';
  } else if (coldStart) {
    glowFilter = `saturate(0.3) ${STATE_GLOW.cold_start}`;
  } else {
    glowFilter = STATE_GLOW[state];
  }

  // Outer animation: breathe or returning-bounce. Tremble lives on the inner div
  // so it doesn't conflict with breathe (both would animate `transform` on one element).
  const outerAnimation = showReturning
    ? 'returning-bounce 0.6s ease-in-out'
    : 'breathe 3s ease-in-out infinite';

  const cfg = SPRITE_CONFIG[state];

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: cfg.width * SCALE,
        height: cfg.height * SCALE,
        filter: glowFilter,
        transition: 'filter 500ms ease, opacity 2s ease',
        animation: outerAnimation,
        opacity,
      }}
    >
      {/* Inner div: tremble animation when burn distress is active */}
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
          onMouseDown={onMouseDown}
          style={{
            imageRendering: 'pixelated',
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
            cursor: 'grab',
            display: 'block',
          }}
        />
        {/* White flash overlay for best-session recognition */}
        {showBestSession && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'white',
              animation: 'best-session-flash 1.5s ease-in-out',
              pointerEvents: 'none',
              borderRadius: 2,
            }}
          />
        )}
      </div>
    </div>
  );
}
