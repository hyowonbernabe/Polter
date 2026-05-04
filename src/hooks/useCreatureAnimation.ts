import { useEffect, useRef, useState } from 'react';
import { type WispState, SPRITE_CONFIG } from '../lib/spriteConfig';

export interface AnimationState {
  frameIndex: number;
  crossfadeProgress: number;  // 0 = fully prev, 1 = fully next
  prevState: WispState | null;
  currentState: WispState;
}

const MIN_FRAME_MS = 83; // 12fps = ~83.3ms per frame
const CROSSFADE_DURATION_MS = 300;

export function useCreatureAnimation(state: WispState): AnimationState {
  const [animState, setAnimState] = useState<AnimationState>({
    frameIndex: 0,
    crossfadeProgress: 1,
    prevState: null,
    currentState: state,
  });

  const rafRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const crossfadeStartRef = useRef<number | null>(null);
  const prevStateRef = useRef<WispState | null>(null);
  const currentStateRef = useRef<WispState>(state);
  const frameIndexRef = useRef<number>(0);

  useEffect(() => {
    if (state !== currentStateRef.current) {
      prevStateRef.current = currentStateRef.current;
      currentStateRef.current = state;
      frameIndexRef.current = 0;
      crossfadeStartRef.current = performance.now();
    }
  }, [state]);

  useEffect(() => {
    function tick(now: number) {
      rafRef.current = requestAnimationFrame(tick);
      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed < MIN_FRAME_MS) return;
      lastFrameTimeRef.current = now;

      const config = SPRITE_CONFIG[currentStateRef.current];
      if (config.frames > 1) {
        frameIndexRef.current = (frameIndexRef.current + 1) % config.frames;
      }

      let crossfadeProgress = 1;
      let prevState: WispState | null = null;
      if (crossfadeStartRef.current !== null) {
        const fadeElapsed = now - crossfadeStartRef.current;
        if (fadeElapsed < CROSSFADE_DURATION_MS) {
          crossfadeProgress = fadeElapsed / CROSSFADE_DURATION_MS;
          prevState = prevStateRef.current;
        } else {
          crossfadeStartRef.current = null;
          prevStateRef.current = null;
        }
      }

      setAnimState({
        frameIndex: frameIndexRef.current,
        crossfadeProgress,
        prevState,
        currentState: currentStateRef.current,
      });
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return animState;
}
