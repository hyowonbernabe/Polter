'use client';
import { useEffect, useRef, useState } from 'react';
import { VHSEffect, VHSHandle } from '@/components/ui/VHSEffect';
import { useContainerSize } from '@/hooks/useContainerSize';

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

/* ── CONFIG (base values at 1920px reference) ── */

const CONFIG = {
  ghost: {
    top: 0.42,
    left: 0.50,
    scale: 4 as const,
  },
  computer: {
    rotation: -30,
  },
  // Base canvas resolution — scaled by container
  baseW: 800,
  baseH: 450,
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
  const { ref: containerRef, width: cw } = useContainerSize();

  // Fluid scale: from ~1.2 at 320px to ~2.8 at 1920px
  const scale = Math.max(2.8, Math.min(2.8, cw / 685));

  useEffect(() => { spriteRef.current = sprite; }, [sprite]);

  // Preload sprites
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

  // Cursor + touch tracking
  useEffect(() => {
    const onMove = (cx: number, cy: number) => {
      if (!hitTargetRef.current) return;
      setSprite(DIR_SPRITES[getCursorDirection(hitTargetRef.current, cx, cy)]);
    };
    const onMouse = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  // Scene compositing loop
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.baseW;
    canvas.height = CONFIG.baseH;
    sceneCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const start = performance.now();
    const spriteSize = CONFIG.ghost.scale * 48;

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const driftY = Math.sin((t * Math.PI * 2) / 4) * 10;

      ctx.clearRect(0, 0, CONFIG.baseW, CONFIG.baseH);

      if (screenImgRef.current) {
        ctx.drawImage(screenImgRef.current, 0, 0, CONFIG.baseW, CONFIG.baseH);
      }

      const ghostImg = spriteImgCache.current.get(spriteRef.current);
      if (ghostImg && ghostImg.complete) {
        const gx = CONFIG.ghost.left * CONFIG.baseW - spriteSize / 2;
        const gy = CONFIG.ghost.top * CONFIG.baseH - spriteSize / 2 + driftY;
        ctx.drawImage(ghostImg, gx, gy, spriteSize, spriteSize);
      }

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
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        width: 'clamp(300px, 55vw, 1100px)',
        height: '100dvh',
        pointerEvents: 'none',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Invisible hit target for cursor direction */}
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

      {/* Computer wrapper — fluid scale */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1376 / 768',
          transform: `scale(${scale}) rotate(${CONFIG.computer.rotation}deg)`,
        }}
      >
        <img src="/assets/computer-screen.png" alt="" style={{ ...imgStyle, zIndex: 1 }} />

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

        <img src="/assets/computer-body.png" alt="" style={{ ...imgStyle, zIndex: 3 }} />
      </div>
    </div>
  );
}
