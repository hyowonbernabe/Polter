'use client';
import { useEffect, useRef } from 'react';

interface DustParticlesProps {
  quantity?:  number;
  size?:     number;
  color?:    string;
  ease?:     number;
  staticity?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
}

export function DustParticles({
  quantity = 600,
  size = 0.4,
  color = '#ffffff',
  ease = 80,
  staticity = 1000,
  className = '',
}: DustParticlesProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctx          = useRef<CanvasRenderingContext2D | null>(null);
  const particles    = useRef<Particle[]>([]);
  const mouse        = useRef({ x: 0, y: 0 });
  const dims         = useRef({ w: 0, h: 0 });
  const raf          = useRef<number>(0);
  const isMobile     = useRef(false);

  const hexToRgb = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  };

  const rgb = hexToRgb(color);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    ctx.current = canvasRef.current.getContext('2d');

    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    isMobile.current = mq.matches;

    const resize = () => {
      if (!containerRef.current || !canvasRef.current || !ctx.current) return;
      const dpr = window.devicePixelRatio;
      dims.current.w = containerRef.current.offsetWidth;
      dims.current.h = containerRef.current.offsetHeight;
      canvasRef.current.width = dims.current.w * dpr;
      canvasRef.current.height = dims.current.h * dpr;
      canvasRef.current.style.width = `${dims.current.w}px`;
      canvasRef.current.style.height = `${dims.current.h}px`;
      ctx.current.scale(dpr, dpr);
      particles.current = [];
      for (let i = 0; i < quantity; i++) {
        particles.current.push({
          x: Math.random() * dims.current.w,
          y: Math.random() * dims.current.h,
          tx: 0, ty: 0,
          size: Math.random() * 2 + size,
          alpha: 0,
          targetAlpha: parseFloat((Math.random() * 0.6 + 0.1).toFixed(1)),
          dx: (Math.random() - 0.5) * 0.1,
          dy: (Math.random() - 0.5) * 0.1,
          magnetism: 0.1 + Math.random() * 4,
        });
      }
    };

    const onMouse = (e: MouseEvent) => {
      if (isMobile.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };

    const tick = () => {
      if (!ctx.current) return;
      ctx.current.clearRect(0, 0, dims.current.w, dims.current.h);

      for (const p of particles.current) {
        const dx = (p.x + p.tx) - mouse.current.x;
        const dy = (p.y + p.ty) - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const voidR = 140;

        if (dist < voidR && !isMobile.current) {
          const force = Math.pow((voidR - dist) / voidR, 2) * staticity * 0.5;
          const angle = Math.atan2(dy, dx);
          p.tx += (Math.cos(angle) * force) / ease;
          p.ty += (Math.sin(angle) * force) / ease;
        } else {
          p.tx -= p.tx / ease;
          p.ty -= p.ty / ease;
        }

        p.x += p.dx;
        p.y += p.dy;
        p.alpha += (p.targetAlpha - p.alpha) * 0.05;

        if (p.x < -p.size || p.x > dims.current.w + p.size ||
            p.y < -p.size || p.y > dims.current.h + p.size) {
          p.x = Math.random() * dims.current.w;
          p.y = Math.random() * dims.current.h;
          p.alpha = 0;
        }

        ctx.current.save();
        ctx.current.translate(p.tx, p.ty);
        ctx.current.beginPath();
        ctx.current.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.current.fillStyle = `rgba(${rgb}, ${p.alpha})`;
        ctx.current.fill();
        ctx.current.restore();
      }

      raf.current = requestAnimationFrame(tick);
    };

    resize();
    tick();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouse);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, [quantity, size, color, ease, staticity, rgb]);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
