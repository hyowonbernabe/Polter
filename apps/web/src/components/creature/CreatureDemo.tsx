'use client';

import { useEffect, useRef, useState } from 'react';
import { createWebPlatform } from '@/lib/webPlatform';
import { useCreaturePhysics } from '@/hooks/useCreaturePhysics';
import { useCreatureAnimation } from '@/hooks/useCreatureAnimation';
import { STATE_GLOW } from '@/lib/spriteConfig';
import type { WispState, Insight } from '@/lib/platform';
import BubbleDemo from './BubbleDemo';

export default function CreatureDemo() {
  const [platform] = useState(() => createWebPlatform());

  useEffect(() => {
    return () => platform._destroy();
  }, [platform]);

  const {
    elementRef,
    physicsState,
    facing,
    velocity,
    dragSquish,
    spriteSize,
    committedDir,
    setWispState,
    setDialogue,
    notifyBubbleClick,
    notifySingleClick,
    notifyDragStart,
    notifyDragMove,
    notifyDragEnd,
  } = useCreaturePhysics(platform);

  // Separate React state for wispState so animation hook re-renders on mood change
  const [wispState, setWispStateR] = useState<WispState>('calm');

  const { spritePath, flip } = useCreatureAnimation(
    wispState,
    physicsState,
    velocity,
    facing,
    committedDir,
  );

  // Wire mood changes into both hooks
  useEffect(() => {
    return platform.onMoodChange((mood) => {
      setWispState(mood);
      setWispStateR(mood);
    });
  }, [platform, setWispState]);

  // Insight bubble
  const [insight, setInsight] = useState<Insight | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return platform.onInsightReady((ins) => {
      setInsight(ins);
      setDialogue(true);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = setTimeout(() => {
        setInsight(null);
        setDialogue(false);
      }, 8_000);
    });
  }, [platform, setDialogue]);

  function dismissBubble() {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    setInsight(null);
    setDialogue(false);
    notifyBubbleClick();
  }

  const glow = physicsState === 'stunned' || physicsState === 'recovering'
    ? STATE_GLOW['cold_start']
    : STATE_GLOW[wispState];

  // ── Drag/click interaction ────────────────────────────────────────────────────
  const isDraggingLocal = useRef(false);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    isDraggingLocal.current = true;
    notifyDragStart(e.clientX, e.clientY);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingLocal.current) return;
    notifyDragMove(e.clientX, e.clientY);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingLocal.current) return;
    isDraggingLocal.current = false;
    notifyDragEnd();
  }

  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    notifySingleClick(e.clientX, e.clientY);
  }

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}
    >
      <div
        ref={elementRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: spriteSize,
          height: spriteSize,
          pointerEvents: 'auto',
          cursor: isDraggingLocal.current ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
      >
        <img
          src={spritePath}
          width={spriteSize}
          height={spriteSize}
          alt=""
          className="pixel-art"
          style={{
            display: 'block',
            transform: `scaleX(${(flip ? -1 : 1) * dragSquish.x}) scaleY(${dragSquish.y})`,
            transformOrigin: 'center center',
            filter: glow,
          }}
        />
        {insight && (
          <BubbleDemo text={insight.text} onDismiss={dismissBubble} />
        )}
      </div>
    </div>
  );
}
