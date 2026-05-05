import { useEffect, useRef, useState } from 'react';
import { type WispState, MOOD_SPRITE, FUN_SPRITES } from '../lib/spriteConfig';
import { type PhysicsState, type Vec2, type FacingDirection } from '../lib/physics';
import { GHOST_URLS } from '../lib/ghostUrls';

export interface GhostAnimationResult {
  spritePath: string;
  flip: boolean;
}

// ─── Direction ring ────────────────────────────────────────────────────────────
// Indices 0-7 clockwise: front → front-right → right → back-right → back → back-left → left → front-left
// Indices 3,4,5 (back-right, back, back-left) are ONLY used during look-around.
// Normal flight uses only 0,1,2,6,7.
const DIR_FILES = [
  'front.png',       // 0
  'front-right.png', // 1
  'right.png',       // 2
  'back-right.png',  // 3  (transition only)
  'back.png',        // 4  (look-around peak)
  'back-left.png',   // 5  (transition only)
  'left.png',        // 6
  'front-left.png',  // 7
];
const DIR_KEYS = ['front', 'front-right', 'right', 'back-right', 'back', 'back-left', 'left', 'front-left'];

const THROW_FRAMES = ['thrown.png', 'thrown-2.png', 'thrown-3.png', 'thrown-4.png'];

const DIR_STEP_MS    = 200;
const THROW_FRAME_MS = 500;
const LOOK_HOLD_MS   = 1_500;
const LOOK_MIN_MS    = 8  * 60_000;  // ~8 min
const LOOK_MAX_MS    = 14 * 60_000;  // ~14 min
const FUN_MIN_MS     = 10 * 60_000;  // ~10 min
const FUN_MAX_MS     = 16 * 60_000;  // ~16 min
const FUN_DISPLAY_MS = 4_000;

function randBetween(min: number, max: number) { return min + Math.random() * (max - min); }

// Target direction index from velocity. Only returns 0,1,2,6,7 (no back states).
function computeTargetDir(vx: number, vy: number): number {
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed < 15) return 0;
  const ratio = Math.abs(vx) / speed;
  if (ratio < 0.25) return 0;                      // mostly vertical → front
  if (vx > 0) return ratio < 0.65 ? 1 : 2;        // front-right or right
  return ratio < 0.65 ? 7 : 6;                     // front-left or left
}

// Exported for tests
export function velocityToDirectionKey(vx: number, vy: number): { key: string; flip: boolean } {
  return { key: DIR_KEYS[computeTargetDir(vx, vy)], flip: false };
}

// Step one position on the ring toward target. CW tie-break when distances equal.
function stepToward(cur: number, tgt: number, preferCW: boolean): number {
  if (cur === tgt) return cur;
  const cw  = (tgt - cur + 8) % 8;
  const ccw = (cur - tgt + 8) % 8;
  if (cw === ccw) return preferCW ? (cur + 1) % 8 : (cur + 7) % 8;
  return cw < ccw ? (cur + 1) % 8 : (cur + 7) % 8;
}

export function useCreatureAnimation(
  wispState: WispState,
  physicsState: PhysicsState,
  velocity: Vec2,
  facing: FacingDirection,
): GhostAnimationResult {

  // ── Direction rotation ──────────────────────────────────────────────────────
  const [currentDir, setCurrentDir] = useState(0);
  const currentDirRef   = useRef(0);
  const targetDirRef    = useRef(0);
  const lookPhaseRef    = useRef<'none' | 'going' | 'holding' | 'returning'>('none');
  const lookCWRef       = useRef(true);
  const velocityRef     = useRef(velocity);
  const physicsStateRef = useRef(physicsState);

  useEffect(() => { velocityRef.current     = velocity;     }, [velocity]);
  useEffect(() => { physicsStateRef.current = physicsState; }, [physicsState]);

  // Single interval drives all direction stepping and look-around phase transitions
  useEffect(() => {
    const id = setInterval(() => {
      const phase = lookPhaseRef.current;

      // During normal flight, keep target in sync with velocity
      if (phase === 'none') {
        const st = physicsStateRef.current;
        const isMoving = st === 'wander' || st === 'glide' || st === 'burst' || st === 'evade';
        targetDirRef.current = isMoving
          ? computeTargetDir(velocityRef.current.x, velocityRef.current.y)
          : 0; // front when idle
      }

      if (phase === 'holding') return; // pause stepping during the back-hold

      const cur = currentDirRef.current;
      const tgt = targetDirRef.current;

      if (cur !== tgt) {
        const next = stepToward(cur, tgt, lookCWRef.current);
        currentDirRef.current = next;
        setCurrentDir(next);
        return;
      }

      // Reached target — advance look-around phase
      if (phase === 'going') {
        lookPhaseRef.current = 'holding';
        setTimeout(() => {
          targetDirRef.current = 0; // rotate back to front
          lookPhaseRef.current = 'returning';
        }, LOOK_HOLD_MS);
      } else if (phase === 'returning') {
        lookPhaseRef.current = 'none';
      }
    }, DIR_STEP_MS);

    return () => clearInterval(id);
  }, []);

  // Look-around trigger: very rare idle event
  useEffect(() => {
    let cancelled = false;
    let tid: ReturnType<typeof setTimeout>;

    function schedule() {
      tid = setTimeout(() => {
        if (cancelled) return;
        const st = physicsStateRef.current;
        const isIdle = st === 'wander' || st === 'fly_idle' || st === 'hover' || st === 'glide';
        if (isIdle && lookPhaseRef.current === 'none') {
          lookCWRef.current = Math.random() < 0.5;
          targetDirRef.current = 4; // back
          lookPhaseRef.current = 'going';
        }
        schedule(); // always reschedule
      }, randBetween(LOOK_MIN_MS, LOOK_MAX_MS));
    }
    schedule();

    return () => { cancelled = true; clearTimeout(tid); };
  }, []);

  // ── Throw animation ─────────────────────────────────────────────────────────
  const [throwFrame, setThrowFrame] = useState(0);
  // Captured once when throw starts — stays consistent through stun + recovery
  const throwFlipRef = useRef(false);

  useEffect(() => {
    if (physicsState !== 'thrown') { setThrowFrame(0); return; }
    throwFlipRef.current = velocity.x < -5; // capture direction at throw start
    setThrowFrame(0);
    const id = setInterval(() => setThrowFrame(f => Math.min(f + 1, 3)), THROW_FRAME_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [physicsState]); // velocity intentionally read from closure at throw-start render

  // ── Fun sprite (very rare, ~10-16 min, shows for 4s) ───────────────────────
  const [funSprite, setFunSprite] = useState<string | null>(null);
  const isCalmFlight =
    physicsState === 'wander' || physicsState === 'fly_idle' ||
    physicsState === 'glide'  || physicsState === 'burst';

  useEffect(() => {
    if (!isCalmFlight) { setFunSprite(null); return; }
    let cancelled = false;
    let showTid: ReturnType<typeof setTimeout>;
    let hideTid: ReturnType<typeof setTimeout>;

    function scheduleShow() {
      showTid = setTimeout(() => {
        if (cancelled) return;
        setFunSprite(FUN_SPRITES[Math.floor(Math.random() * FUN_SPRITES.length)]);
        hideTid = setTimeout(() => {
          if (cancelled) return;
          setFunSprite(null);
          scheduleShow();
        }, FUN_DISPLAY_MS);
      }, randBetween(FUN_MIN_MS, FUN_MAX_MS));
    }
    scheduleShow();

    return () => { cancelled = true; clearTimeout(showTid); clearTimeout(hideTid); };
  }, [isCalmFlight]);

  // ── Sprite priority resolution ──────────────────────────────────────────────
  // Each direction sprite has its own file — no flipping for directions.
  // Flipping only applies to action/physics sprites (throw, recover, grab).
  let file: string;
  let flip = false;

  if (physicsState === 'tether_grab') {
    file = 'grab.png';
    flip = facing === 'left';
  } else if (physicsState === 'thrown') {
    file = THROW_FRAMES[throwFrame];
    flip = throwFlipRef.current;
  } else if (physicsState === 'stunned') {
    file = 'dizzy.png';
    flip = throwFlipRef.current; // consistent with throw direction
  } else if (physicsState === 'dialogue') {
    file = 'replying.png';
  } else if (physicsState === 'click_react') {
    file = 'jumpscared.png';
    flip = facing === 'left';
  } else if (physicsState === 'recovering') {
    file = 'falling-2.png';
    flip = !throwFlipRef.current;
  } else if (funSprite !== null) {
    file = funSprite;
  } else if (
    physicsState === 'perching' || physicsState === 'land_impact' ||
    physicsState === 'hover'    || physicsState === 'fly_idle'
  ) {
    // Stationary — show mood sprite facing front
    file = MOOD_SPRITE[wispState];
  } else {
    // Active flight — direction sprite based on current rotation position
    file = DIR_FILES[currentDir];
  }

  return { spritePath: GHOST_URLS[file] ?? GHOST_URLS['front.png'], flip };
}
