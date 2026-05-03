import { useEffect, useRef } from "react";
import spriteUrl from "../assets/sprites/wisp-focus.png";

// Source pixel dimensions of the sprite PNG (16×32 native pixel art).
const SPRITE_W = 16;
const SPRITE_H = 32;
// CSS scale — canvas stays at source size, CSS enlarges it 4×.
const SCALE = 4;

interface CreatureProps {
  x: number;
  y: number;
  onPositionChange: (x: number, y: number) => void;
}

export default function Creature({ x, y, onPositionChange }: CreatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
      ctx.drawImage(img, 0, 0, SPRITE_W, SPRITE_H);
    };
    img.src = spriteUrl;
  }, []);

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
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onPositionChange]);

  return (
    <canvas
      ref={canvasRef}
      width={SPRITE_W}
      height={SPRITE_H}
      onMouseDown={onMouseDown}
      style={{
        position: "fixed",
        left: x,
        top: y,
        imageRendering: "pixelated",
        transform: `scale(${SCALE})`,
        transformOrigin: "top left",
        cursor: "grab",
      }}
    />
  );
}
