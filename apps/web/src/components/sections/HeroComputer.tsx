'use client';
import { useEffect, useRef, useState } from 'react';
import { VHSEffect, VHSHandle } from '@/components/ui/VHSEffect';

/* ── Direction mapping ── */

const DIR_SPRITES: Record<string, string> = {
  'front': 'front.png',
  'front-right': 'front-right.png',
  'right': 'right.png',
  'back-right': 'back-right.png',
  'back': 'back.png',
  'back-left': 'back-left.png',
  'left': 'left.png',
  'front-left': 'front-left.png',
};

function getCursorDirection(el: HTMLElement, cx: number, cy: number): string {
  const rect = el.getBoundingClientRect();
  const gx = rect.left + rect.width / 2;
  const gy = rect.top + rect.height / 2;
  const angle = Math.atan2(cy - gy, cx - gx) * (180 / Math.PI);
  const a = (angle + 360) % 360;
  if (a >= 337.5 || a < 22.5) return 'right';
  if (a < 67.5) return 'front-right';
  if (a < 112.5) return 'front';
  if (a < 157.5) return 'front-left';
  if (a < 202.5) return 'left';
  if (a < 247.5) return 'back-left';
  if (a < 292.5) return 'back';
  return 'back-right';
}

/* ── ADJUST THESE ── */

const CONFIG = {
  container: {
    left: '50%',
    top: '0',
    width: '55vw',
  },
  computer: {
    scale: 2.8,
    rotation: -30,
    offsetX: '0px',
    offsetY: '0px',
  },
  ghost: {
    top: 0.42,   // fraction 0-1, vertical position on screen
    left: 0.50,   // fraction 0-1, horizontal position on screen
    scale: 4 as const,
  },
  // Scene canvas resolution (feeds into shader)
  sceneW: 800,
  sceneH: 450,
};

/* ── Component ── */

export function HeroComputer() {
  const [sprite, setSprite] = useState('front.png');
  const vhsRef = useRef<VHSHandle>(null);
  const hitTargetRef = useRef<HTMLDivElement>(null);
  const sceneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenImgRef = useRef<HTMLImageElement | null>(null);
  const spriteImgCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const spriteRef = useRef('front.png');
  const rafRef = useRef<number>(0);

  // Keep spriteRef in sync
  useEffect(() => { spriteRef.current = sprite; }, [sprite]);

  // Preload all sprite images
  useEffect(() => {
    Object.values(DIR_SPRITES).forEach(name => {
      if (spriteImgCache.current.has(name)) return;
      const img = new Image();
      img.src = `/sprites/${name}`;
      spriteImgCache.current.set(name, img);
    });
  }, []);

  // Load screen image
  useEffect(() => {
    const img = new Image();
    img.src = '/assets/computer-screen.png';
    img.onload = () => { screenImgRef.current = img; };
  }, []);

  // Cursor tracking (uses hitTargetRef for direction calculation)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!hitTargetRef.current) return;
      setSprite(DIR_SPRITES[getCursorDirection(hitTargetRef.current, e.clientX, e.clientY)]);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // Scene compositing loop: draw screen + ghost onto canvas, feed to VHS shader
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.sceneW;
    canvas.height = CONFIG.sceneH;
    sceneCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false; // pixel art

    const start = performance.now();
    const spriteSize = CONFIG.ghost.scale * 48;

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const driftY = Math.sin((t * Math.PI * 2) / 4) * 10;

      ctx.clearRect(0, 0, CONFIG.sceneW, CONFIG.sceneH);

      // Draw screen
      if (screenImgRef.current) {
        ctx.drawImage(screenImgRef.current, 0, 0, CONFIG.sceneW, CONFIG.sceneH);
      }

      // Draw ghost sprite
      const ghostImg = spriteImgCache.current.get(spriteRef.current);
      if (ghostImg && ghostImg.complete) {
        const gx = CONFIG.ghost.left * CONFIG.sceneW - spriteSize / 2;
        const gy = CONFIG.ghost.top * CONFIG.sceneH - spriteSize / 2 + driftY;
        ctx.drawImage(ghostImg, gx, gy, spriteSize, spriteSize);
      }

      // Feed to VHS shader
      vhsRef.current?.updateScene(canvas);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    imageRendering: 'pixelated',
    display: 'block',
  };

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: CONFIG.container.top,
        left: CONFIG.container.left,
        width: CONFIG.container.width,
        height: '100dvh',
        pointerEvents: 'none',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Invisible hit target for cursor direction (positioned where ghost visually is) */}
      <div
        ref={hitTargetRef}
        style={{
          position: 'absolute',
          top: '42%',
          left: '50%',
          width: 1,
          height: 1,
          pointerEvents: 'auto',
        }}
      />

      {/* Computer wrapper */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1376 / 768',
          transform: `scale(${CONFIG.computer.scale}) rotate(${CONFIG.computer.rotation}deg) translate(${CONFIG.computer.offsetX}, ${CONFIG.computer.offsetY})`,
        }}
      >
        {/* Screen cover — hides any ghost bleed underneath */}
        <img src="/assets/computer-screen.png" alt="" style={{ ...imgStyle, zIndex: 1 }} />

        {/* VHS layer: ghost distorted by shader */}
        <VHSEffect
          ref={vhsRef}
          style={{
            ...imgStyle,
            zIndex: 2,
            pointerEvents: 'none',
            maskImage: 'url(/assets/computer-screen.png)',
            maskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskImage: 'url(/assets/computer-screen.png)',
            WebkitMaskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
          }}
        />

        {/* Computer body (front, covers edges) */}
        <img src="/assets/computer-body.png" alt="" style={{ ...imgStyle, zIndex: 3 }} />
      </div>
    </div>
  );
}
