import { useEffect, useRef, useState } from 'react';
import { type PolterState, MOOD_SPRITE, FUN_SPRITES } from '../lib/spriteConfig';
import { type PhysicsState, type Vec2, type FacingDirection } from '../lib/physics';
import { GHOST_URLS } from '../lib/ghostUrls';

export interface GhostAnimationResult {
  spritePath: string;
  flip: boolean;
}

// ─── Direction ring ────────────────────────────────────────────────────────────
// Indices 0-7 clockwise: front → front-right → right → back-right → back → back-left → left → front-left
// Indices 3,4,5 (back-right, back, back-left) are ONLY used during look-around.
// Normal flight uses only 0,1,2,6,7 — committed from the physics tick via committedDir.
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

// Pure helper — maps velocity to a direction ring index (0-7).
// Mirrors the logic in useCreaturePhysics tick(). Exported for tests.
function computeDir(vx: number, vy: number): number {
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed < 15) return 0;
  const ratio = Math.abs(vx) / speed;
  if (ratio < 0.25) return 0;
  if (vx > 0) return ratio < 0.65 ? 1 : 2;
  return ratio < 0.65 ? 7 : 6;
}

export function velocityToDirectionKey(vx: number, vy: number): { key: string; flip: boolean } {
  return { key: DIR_KEYS[computeDir(vx, vy)], flip: false };
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
  polterState: PolterState,
  physicsState: PhysicsState,
  _velocity: Vec2,
  facing: FacingDirection,
  committedDir: number,
): GhostAnimationResult {

  // ── Look-around state ─────────────────────────────────────────────────────
  // Direction for normal flight comes from committedDir (physics tick).
  // Look-around uses its own stepping mechanism to smoothly rotate to back and return.
  const [lookCurrentDir, setLookCurrentDir] = useState(0);
  const lookCurrentDirRef = useRef(0);
  const lookTargetDirRef  = useRef(0);
  const lookPhaseRef      = useRef<'none' | 'going' | 'holding' | 'returning'>('none');
  const lookCWRef         = useRef(true);
  const physicsStateRef   = useRef(physicsState);
  useEffect(() => { physicsStateRef.current = physicsState; }, [physicsState]);

  // Interval only for look-around stepping — a no-op when lookPhase is 'none'
  useEffect(() => {
    const id = setInterval(() => {
      const phase = lookPhaseRef.current;
      if (phase === 'none' || phase === 'holding') return;

      const cur = lookCurrentDirRef.current;
      const tgt = lookTargetDirRef.current;
      if (cur !== tgt) {
        const next = stepToward(cur, tgt, lookCWRef.current);
        lookCurrentDirRef.current = next;
        setLookCurrentDir(next);
      } else {
        if (phase === 'going') {
          lookPhaseRef.current = 'holding';
          setTimeout(() => {
            lookTargetDirRef.current = 0;
            lookPhaseRef.current = 'returning';
          }, LOOK_HOLD_MS);
        } else if (phase === 'returning') {
          lookCurrentDirRef.current = 0;
          setLookCurrentDir(0);
          lookPhaseRef.current = 'none';
        }
      }
    }, DIR_STEP_MS);
    return () => clearInterval(id);
  }, []);

  // Look-around trigger: rare idle event
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
          lookCurrentDirRef.current = 0;
          lookTargetDirRef.current = 4; // back
          lookPhaseRef.current = 'going';
        }
        schedule();
      }, randBetween(LOOK_MIN_MS, LOOK_MAX_MS));
    }
    schedule();

    return () => { cancelled = true; clearTimeout(tid); };
  }, []);

  // ── Throw animation ─────────────────────────────────────────────────────────
  const [throwFrame, setThrowFrame] = useState(0);
  const throwFlipRef = useRef(false);

  useEffect(() => {
    if (physicsState !== 'thrown') { setThrowFrame(0); return; }
    // Use cursor-movement facing, not spring velocity — the spring oscillates and can point
    // the wrong way at the exact frame of release, causing 50/50 wrong throw direction.
    throwFlipRef.current = facing === 'left';
    setThrowFrame(0);
    const id = setInterval(() => setThrowFrame(f => Math.min(f + 1, 3)), THROW_FRAME_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [physicsState]);

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

  // ── Goal-arrived fun sprite ─────────────────────────────────────────────────
  // Picks a random fun sprite once when entering goal_arrived, holds it for the duration.
  const [goalFunSprite, setGoalFunSprite] = useState<string | null>(null);
  useEffect(() => {
    if (physicsState === 'goal_arrived') {
      setGoalFunSprite(FUN_SPRITES[Math.floor(Math.random() * FUN_SPRITES.length)]);
    } else {
      setGoalFunSprite(null);
    }
  }, [physicsState]);

  // ── Sprite priority resolution ──────────────────────────────────────────────
  // Direction for flight: use look-around override when active, otherwise committedDir from physics.
  const displayDir = lookPhaseRef.current !== 'none' ? lookCurrentDir : committedDir;

  let file: string;
  let flip = false;

  if (physicsState === 'tether_grab' || physicsState === 'goal_interrupted') {
    file = 'grab.png';
    flip = facing === 'left';
  } else if (physicsState === 'thrown') {
    file = THROW_FRAMES[throwFrame];
    flip = throwFlipRef.current;
  } else if (physicsState === 'stunned') {
    file = 'dizzy.png';
    flip = throwFlipRef.current;
  } else if (physicsState === 'flee') {
    file = 'jumpscared.png';
    flip = facing === 'left';
  } else if (physicsState === 'dialogue') {
    file = 'replying.png';
  } else if (physicsState === 'click_react') {
    file = 'jumpscared.png';
    flip = facing === 'left';
  } else if (physicsState === 'recovering') {
    file = 'falling-2.png';
    flip = !throwFlipRef.current;
  } else if (physicsState === 'goal_arrived') {
    file = goalFunSprite ?? MOOD_SPRITE[polterState];
  } else if (funSprite !== null) {
    file = funSprite;
  } else if (physicsState === 'goal_thinking') {
    file = 'thinking.png';
  } else if (
    physicsState === 'perching'    || physicsState === 'land_impact' ||
    physicsState === 'hover'       || physicsState === 'fly_idle'
  ) {
    file = MOOD_SPRITE[polterState];
  } else {
    file = DIR_FILES[displayDir];
  }

  return { spritePath: GHOST_URLS[file] ?? GHOST_URLS['front.png'], flip };
}
