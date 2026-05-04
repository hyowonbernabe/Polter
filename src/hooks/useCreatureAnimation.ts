import { useEffect, useRef, useState } from 'react';
import { type WispState, SPRITE_CONFIG } from '../lib/spriteConfig';
import { type PhysicsState, type Vec2, type FacingDirection, magnitude } from '../lib/physics';

export interface AnimationState {
  frameIndex: number;
  crossfadeProgress: number;
  prevState: WispState | null;
  currentState: WispState;
  flip: boolean;        // true = mirror horizontally (right-facing)
  playbackRate: number; // 1.0 = normal; >1 = faster wing beats
}

const BASE_FRAME_MS = 83; // 12fps baseline
const CROSSFADE_DURATION_MS = 300;

function getPlaybackRate(physicsState: PhysicsState, speed: number): number {
  if (physicsState === 'grabbed' || physicsState === 'stunned') return 0.3;
  if (physicsState === 'perching' || physicsState === 'land_impact') return 0.5;
  if (physicsState === 'fly_idle' || physicsState === 'hover' || physicsState === 'dialogue') return 0.8;
  return 1.0 + Math.max(0, (speed - 80) / 200);
}

export function useCreatureAnimation(
  wispState: WispState,
  physicsState: PhysicsState,
  velocity: Vec2,
  facing: FacingDirection,
): AnimationState {
  const [animState, setAnimState] = useState<AnimationState>({
    frameIndex: 0,
    crossfadeProgress: 1,
    prevState: null,
    currentState: wispState,
    flip: false,
    playbackRate: 1,
  });

  const rafRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const crossfadeStartRef = useRef<number | null>(null);
  const prevStateRef = useRef<WispState | null>(null);
  const currentStateRef = useRef<WispState>(wispState);
  const frameIndexRef = useRef<number>(0);

  const physicsStateRef = useRef<PhysicsState>(physicsState);
  const velocityRef = useRef<Vec2>(velocity);
  const facingRef = useRef<FacingDirection>(facing);

  useEffect(() => {
    if (wispState !== currentStateRef.current) {
      prevStateRef.current = currentStateRef.current;
      currentStateRef.current = wispState;
      frameIndexRef.current = 0;
      crossfadeStartRef.current = performance.now();
    }
  }, [wispState]);

  useEffect(() => { physicsStateRef.current = physicsState; }, [physicsState]);
  useEffect(() => { velocityRef.current = velocity; }, [velocity]);
  useEffect(() => { facingRef.current = facing; }, [facing]);

  useEffect(() => {
    function tick(now: number) {
      rafRef.current = requestAnimationFrame(tick);

      const speed = magnitude(velocityRef.current);
      const rate = getPlaybackRate(physicsStateRef.current, speed);
      const frameDuration = BASE_FRAME_MS / rate;
      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed < frameDuration) return;
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

      // left-facing is canonical; flip for right-facing. forward = no flip.
      const flip = facingRef.current === 'right';

      setAnimState({
        frameIndex: frameIndexRef.current,
        crossfadeProgress,
        prevState,
        currentState: currentStateRef.current,
        flip,
        playbackRate: rate,
      });
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return animState;
}
