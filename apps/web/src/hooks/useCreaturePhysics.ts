import { useCallback, useEffect, useRef, useState } from 'react';
import { createNoise2D } from 'simplex-noise';
import {
  PHYSICS, MOOD_MODIFIERS,
  type PhysicsState, type PerchSurface, type FacingDirection, type Vec2, type WorkArea,
  clamp, normalize, magnitude, clampVec2, randBetween, lerp,
} from '@/lib/physics';
import type { WispState } from '@/lib/platform';
import type { CreaturePlatform } from '@/lib/platform';

// Fixed sprite size for the web demo: 2× base (96px)
const SPRITE_SIZE = 96;

// Single browser window — all edges are outer edges
function isOuterEdge(_mb: WorkArea, _side: 'left' | 'right' | 'top' | 'bottom'): boolean {
  return true;
}

// Cursor slow threshold (not in PHYSICS constants — hardcoded here)
const SLOW_CURSOR_THRESHOLD = 50;

export interface PhysicsOutput {
  elementRef: React.RefObject<HTMLDivElement | null>;
  physicsState: PhysicsState;
  facing: FacingDirection;
  velocity: Vec2;
  dragSquish: Vec2;
  workArea: WorkArea;
  spriteSize: number;
  committedDir: number;

  setWispState: (s: WispState) => void;
  setDialogue: (visible: boolean) => void;
  notifyBubbleClick: () => void;
  notifySingleClick: (cx: number, cy: number) => void;
  notifyDragStart: (clientX: number, clientY: number) => void;
  notifyDragMove: (clientX: number, clientY: number) => void;
  notifyDragEnd: () => void;
}

export function useCreaturePhysics(platform: CreaturePlatform): PhysicsOutput {
  const elementRef = useRef<HTMLDivElement>(null);

  // ── React state — only for things the render tree actually reads ─────────────
  const [physicsState, setPhysicsStateR] = useState<PhysicsState>('wander');
  const [facing, setFacingR] = useState<FacingDirection>('right');
  const [velocity, setVelocityR] = useState<Vec2>({ x: 0, y: 0 });
  const [dragSquish, setDragSquishR] = useState<Vec2>({ x: 1, y: 1 });
  const [workArea, setWorkArea] = useState<WorkArea>({ x: 0, y: 0, width: 1280, height: 800 });
  const [committedDir, setCommittedDirR] = useState<number>(0);

  // ── Physics refs — mutated in rAF, never trigger renders ─────────────────────
  const pos = useRef<Vec2>({ x: 200, y: 200 });
  const vel = useRef<Vec2>({ x: 40, y: -20 });
  const stateRef = useRef<PhysicsState>('wander');
  const facingRef = useRef<FacingDirection>('right');
  const workAreaRef = useRef<WorkArea>({ x: 0, y: 0, width: 1280, height: 800 });
  const wispStateRef = useRef<WispState>('calm');
  const spriteSize = SPRITE_SIZE;

  const noiseT = useRef<number>(0);
  const noise2D = useRef(createNoise2D());

  // Timers (ms countdown)
  const landTimerRef = useRef<number>(randBetween(PHYSICS.LAND_TIMER_MIN, PHYSICS.LAND_TIMER_MAX));
  const perchTimerRef = useRef<number>(randBetween(PHYSICS.PERCH_TIMER_MIN, PHYSICS.PERCH_TIMER_MAX));
  const burstTimerRef = useRef<number>(randBetween(PHYSICS.BURST_INTERVAL_MIN, PHYSICS.BURST_INTERVAL_MAX));
  const burstActiveRef = useRef<number>(0);
  const flyIdleTimerRef = useRef<number>(randBetween(PHYSICS.FLY_IDLE_INTERVAL_MIN, PHYSICS.FLY_IDLE_INTERVAL_MAX));
  const flyIdleHoldRef = useRef<number>(0);
  const lockedUntilRef = useRef<number>(0);
  const perchSurfaceRef = useRef<PerchSurface>('bottom');
  const dialogueActiveRef = useRef<boolean>(false);

  // Direction tracking
  const dirLastIdealRef  = useRef<number>(0);
  const dirHoldMsRef     = useRef<number>(0);
  const committedDirRef  = useRef<number>(0);
  const lastSyncedDirRef = useRef<number>(0);

  // Goal system
  const goalTimerRef     = useRef<number>(randBetween(PHYSICS.GOAL_INTERVAL_MIN, PHYSICS.GOAL_INTERVAL_MAX));
  const goalDestRef      = useRef<Vec2 | null>(null);
  const goalThinkEndRef  = useRef<number>(0);
  const goalArriveEndRef = useRef<number>(0);

  // Cursor
  const cursorPosRef = useRef<Vec2>({ x: 0, y: 0 });
  const cursorVelRef = useRef<Vec2>({ x: 0, y: 0 });
  const lastCursorRef = useRef<{ pos: Vec2; t: number }>({ pos: { x: 0, y: 0 }, t: 0 });

  // Drag
  const isDraggingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<Vec2>({ x: 0, y: 0 });
  const pointerHistoryRef = useRef<Array<{ x: number; y: number; t: number }>>([]);

  // Persistence
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // rAF
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  // React state sync throttle
  const reactSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function transitionTo(next: PhysicsState, lockMs = 0) {
    if (stateRef.current !== next) {
      stateRef.current = next;
      setPhysicsStateR(next);
    }
    setVelocityR({ ...vel.current });
    setFacingR(facingRef.current);
    if (lockMs > 0) lockedUntilRef.current = performance.now() + lockMs;
    scheduleReactSync();
  }

  function scheduleReactSync() {
    if (reactSyncTimerRef.current) return;
    reactSyncTimerRef.current = setTimeout(() => {
      reactSyncTimerRef.current = null;
      setPhysicsStateR(stateRef.current);
      setFacingR(facingRef.current);
      setVelocityR({ ...vel.current });
    }, 80);
  }

  function updateTransform() {
    const el = elementRef.current;
    if (!el) return;
    el.style.transform = `translate(${Math.round(pos.current.x)}px, ${Math.round(pos.current.y)}px)`;
  }

  function scheduleSave(x: number, y: number) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const wa = workAreaRef.current;
      if (wa.width === 0) return;
      platform.savePosition({
        x: (x - wa.x) / wa.width,
        y: (y - wa.y) / wa.height,
      });
    }, PHYSICS.SAVE_DEBOUNCE_MS);
  }

  function getMoodMod() {
    return MOOD_MODIFIERS[wispStateRef.current] ?? MOOD_MODIFIERS.calm;
  }

  function snapToSurface(surface: PerchSurface, sz: number, wa: WorkArea) {
    const p = pos.current;
    if (surface === 'bottom') p.y = wa.y + wa.height - sz;
    else if (surface === 'top') p.y = wa.y;
    else if (surface === 'left') p.x = wa.x;
    else p.x = wa.x + wa.width - sz;
  }

  function triggerRelaunch() {
    const surface = perchSurfaceRef.current;
    const v = vel.current;
    if (surface === 'bottom') { v.y = -PHYSICS.RELAUNCH_SPEED; v.x = randBetween(-60, 60); }
    else if (surface === 'top') { v.y = PHYSICS.RELAUNCH_SPEED; v.x = randBetween(-60, 60); }
    else if (surface === 'left') { v.x = PHYSICS.RELAUNCH_SPEED; v.y = randBetween(-60, 60); }
    else { v.x = -PHYSICS.RELAUNCH_SPEED; v.y = randBetween(-60, 60); }
    perchTimerRef.current = randBetween(PHYSICS.PERCH_TIMER_MIN, PHYSICS.PERCH_TIMER_MAX);
    transitionTo('relaunch', PHYSICS.RELAUNCH_DURATION_MS);
  }

  // ── Physics tick ──────────────────────────────────────────────────────────────

  function tick(now: number) {
    rafRef.current = requestAnimationFrame(tick);
    const dt = Math.min((now - lastTickRef.current) / 1000, 0.05);
    if (dt <= 0) { lastTickRef.current = now; return; }
    lastTickRef.current = now;

    const state = stateRef.current;
    const wa = workAreaRef.current;
    const sz = SPRITE_SIZE;
    const locked = now < lockedUntilRef.current;
    const mood = getMoodMod();

    if (state === 'grabbed') return;

    const p = pos.current;
    const v = vel.current;

    // Single window — mb === wa always
    const mb = wa;
    const maxSpeed = PHYSICS.MAX_SPEED * mood.speedMult;
    const noiseFreq = PHYSICS.NOISE_FREQ * mood.freqMult;

    // ── Goal timer ────────────────────────────────────────────────────────────
    const isCalmState = state === 'wander' || state === 'glide' || state === 'burst' || state === 'fly_idle';
    if (isCalmState) {
      goalTimerRef.current -= dt * 1000;
      if (!locked && goalTimerRef.current <= 0) {
        const margin = PHYSICS.GOAL_EDGE_MARGIN;
        const safeW = mb.width  - margin * 2 - sz;
        const safeH = mb.height - margin * 2 - sz;
        if (safeW > 0 && safeH > 0) {
          goalDestRef.current = {
            x: mb.x + margin + Math.random() * safeW,
            y: mb.y + margin + Math.random() * safeH,
          };
          goalThinkEndRef.current = now + randBetween(PHYSICS.GOAL_THINKING_MIN, PHYSICS.GOAL_THINKING_MAX);
          transitionTo('goal_thinking');
        } else {
          goalTimerRef.current = randBetween(PHYSICS.GOAL_INTERVAL_MIN, PHYSICS.GOAL_INTERVAL_MAX);
        }
      }
    }

    // ── Per-state logic ───────────────────────────────────────────────────────

    if (state === 'wander' || state === 'glide' || state === 'burst') {
      noiseT.current += dt * 1000;
      const nx = noise2D.current(noiseT.current * noiseFreq, 0);
      const ny = noise2D.current(0, noiseT.current * noiseFreq);
      const desired = normalize({ x: nx, y: ny });
      const steer = clampVec2(
        { x: desired.x * maxSpeed - v.x, y: desired.y * maxSpeed - v.y },
        PHYSICS.MAX_FORCE,
      );

      burstTimerRef.current -= dt * 1000;
      if (burstTimerRef.current <= 0) {
        burstActiveRef.current = PHYSICS.BURST_DURATION_MS;
        burstTimerRef.current = randBetween(PHYSICS.BURST_INTERVAL_MIN, PHYSICS.BURST_INTERVAL_MAX);
      }
      burstActiveRef.current -= dt * 1000;
      const effectiveMax = burstActiveRef.current > 0 ? maxSpeed * PHYSICS.BURST_SPEED_MULT : maxSpeed;

      const cx = mb.x + mb.width / 2;
      const cy = mb.y + mb.height / 2;
      const toCenterN = normalize({ x: cx - (p.x + sz / 2), y: cy - (p.y + sz / 2) });
      const centerF = { x: toCenterN.x * PHYSICS.CENTER_PULL, y: toCenterN.y * PHYSICS.CENTER_PULL };

      const cursorSpeed = magnitude(cursorVelRef.current);
      let cursorF = { x: 0, y: 0 };
      const distToCursor = magnitude({
        x: cursorPosRef.current.x - (p.x + sz / 2),
        y: cursorPosRef.current.y - (p.y + sz / 2),
      });

      if (distToCursor < PHYSICS.CURSOR_AVOID_RADIUS) {
        const toCursor = normalize({
          x: cursorPosRef.current.x - (p.x + sz / 2),
          y: cursorPosRef.current.y - (p.y + sz / 2),
        });
        const repelForce = -PHYSICS.CURSOR_REPULSE * (1 - distToCursor / PHYSICS.CURSOR_AVOID_RADIUS);
        cursorF = { x: toCursor.x * repelForce, y: toCursor.y * repelForce };
      }

      if (cursorSpeed > PHYSICS.FAST_CURSOR_THRESHOLD && distToCursor < PHYSICS.CURSOR_AVOID_RADIUS && !locked) {
        transitionTo('evade');
      }

      const margin = PHYSICS.EDGE_AVOID_MARGIN;
      let edgeFx = 0, edgeFy = 0;
      const repLeft   = p.x - mb.x < margin            ? PHYSICS.EDGE_REPULSE * (1 - (p.x - mb.x) / margin) : 0;
      const repRight  = (mb.x + mb.width) - (p.x + sz) < margin ? -PHYSICS.EDGE_REPULSE * (1 - ((mb.x + mb.width) - (p.x + sz)) / margin) : 0;
      const repTop    = p.y - mb.y < margin             ? PHYSICS.EDGE_REPULSE * (1 - (p.y - mb.y) / margin) : 0;
      const repBottom = (mb.y + mb.height) - (p.y + sz) < margin ? -PHYSICS.EDGE_REPULSE * (1 - ((mb.y + mb.height) - (p.y + sz)) / margin) : 0;

      edgeFx += repLeft + repRight;
      edgeFy += repTop + repBottom;

      v.x += (steer.x + centerF.x + cursorF.x + edgeFx) * dt;
      v.y += (steer.y + centerF.y + cursorF.y + edgeFy) * dt;
      const clamped = clampVec2(v, effectiveMax);
      v.x = clamped.x; v.y = clamped.y;

      if (state === 'glide') {
        const drag = Math.pow(PHYSICS.COAST_DRAG * mood.coastMult, dt);
        v.x *= drag; v.y *= drag;
        if (magnitude(v) < 5) transitionTo('wander');
      }

      flyIdleTimerRef.current -= dt * 1000;
      if (!locked && flyIdleTimerRef.current <= 0) {
        flyIdleHoldRef.current = randBetween(PHYSICS.FLY_IDLE_DURATION_MIN, PHYSICS.FLY_IDLE_DURATION_MAX);
        flyIdleTimerRef.current = randBetween(PHYSICS.FLY_IDLE_INTERVAL_MIN, PHYSICS.FLY_IDLE_INTERVAL_MAX);
        transitionTo('fly_idle');
        v.x = 0; v.y = 0;
      }

      landTimerRef.current -= dt * 1000 * mood.landBias;
      if (!locked && landTimerRef.current <= 0) {
        landTimerRef.current = randBetween(PHYSICS.LAND_TIMER_MIN, PHYSICS.LAND_TIMER_MAX);
        perchSurfaceRef.current = 'bottom';
        v.x *= 0.3;
        v.y = PHYSICS.APPROACH_SPEED;
        transitionTo('approach');
      }

      if (Math.abs(v.x) > 5) {
        facingRef.current = dialogueActiveRef.current ? 'forward' : (v.x > 0 ? 'right' : 'left');
      }
    }

    else if (state === 'fly_idle') {
      v.x *= Math.pow(0.8, dt);
      v.y *= Math.pow(0.8, dt);
      flyIdleHoldRef.current -= dt * 1000;
      if (!locked && flyIdleHoldRef.current <= 0) transitionTo('wander');
    }

    else if (state === 'hover') {
      v.x *= Math.pow(0.7, dt);
      v.y *= Math.pow(0.7, dt);
      if (!locked && magnitude(v) > PHYSICS.HOVER_THRESHOLD) transitionTo('wander');
    }

    else if (state === 'evade') {
      noiseT.current += dt * 1000;
      const noiseFreqEvade = PHYSICS.NOISE_FREQ * mood.freqMult * 3;
      const nx = noise2D.current(noiseT.current * noiseFreqEvade, 0.5);
      const ny = noise2D.current(0.5, noiseT.current * noiseFreqEvade);
      const desired = normalize({ x: nx, y: ny });
      v.x += desired.x * PHYSICS.MAX_FORCE * 2 * dt;
      v.y += desired.y * PHYSICS.MAX_FORCE * 2 * dt;
      const clamped = clampVec2(v, maxSpeed * 1.6);
      v.x = clamped.x; v.y = clamped.y;
      if (!locked && magnitude(cursorVelRef.current) < SLOW_CURSOR_THRESHOLD) {
        transitionTo('wander');
      }
    }

    else if (state === 'approach') {
      v.y = clamp(v.y + PHYSICS.APPROACH_SPEED * dt * 2, -PHYSICS.APPROACH_SPEED, PHYSICS.APPROACH_SPEED * 1.5);
      v.x *= Math.pow(0.85, dt);
      const surface = perchSurfaceRef.current;
      const nearSurface =
        surface === 'bottom' ? (mb.y + mb.height) - (p.y + sz) < PHYSICS.LAND_DISTANCE :
        surface === 'top'    ? p.y - mb.y < PHYSICS.LAND_DISTANCE :
        surface === 'left'   ? p.x - mb.x < PHYSICS.LAND_DISTANCE :
        (mb.x + mb.width) - (p.x + sz) < PHYSICS.LAND_DISTANCE;
      if (nearSurface) {
        v.x = 0; v.y = 0;
        snapToSurface(surface, sz, mb);
        transitionTo('land_impact', PHYSICS.LAND_IMPACT_DURATION);
      }
    }

    else if (state === 'land_impact') {
      if (!locked) {
        perchTimerRef.current = randBetween(PHYSICS.PERCH_TIMER_MIN, PHYSICS.PERCH_TIMER_MAX);
        transitionTo('perching');
      }
    }

    else if (state === 'perching') {
      v.x = 0; v.y = 0;
      snapToSurface(perchSurfaceRef.current, sz, mb);
      if (!dialogueActiveRef.current && facingRef.current === 'forward') {
        facingRef.current = 'left';
      }
      perchTimerRef.current -= dt * 1000;
      if (!locked && perchTimerRef.current <= 0) triggerRelaunch();
    }

    else if (state === 'relaunch') {
      if (!locked) transitionTo('burst');
    }

    else if (state === 'thrown' || state === 'stunned' || state === 'recovering') {
      const GRAVITY  = 1400;
      const AIR_DRAG = Math.pow(0.42, dt);

      if (state !== 'recovering') {
        v.y += GRAVITY * dt;
      }
      v.x *= AIR_DRAG;
      v.y *= AIR_DRAG;

      p.x += v.x * dt;
      p.y += v.y * dt;

      const BOUNCE = 0.55;
      if (p.x < mb.x) {
        p.x = mb.x;
        v.x = Math.abs(v.x) * BOUNCE;
        if (state === 'thrown') transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
      }
      if (p.x + sz > mb.x + mb.width) {
        p.x = mb.x + mb.width - sz;
        v.x = -Math.abs(v.x) * BOUNCE;
        if (state === 'thrown') transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
      }
      if (p.y < mb.y) {
        p.y = mb.y;
        v.y = Math.abs(v.y) * BOUNCE;
        if (state === 'thrown') transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
      }
      if (p.y + sz > mb.y + mb.height) {
        p.y = mb.y + mb.height - sz;
        v.y = -Math.abs(v.y) * BOUNCE;
        if (Math.abs(v.y) < 60) v.y = 0;
        if (state === 'thrown') transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
      }

      if (state === 'stunned' && !locked) {
        v.y = -600;
        transitionTo('recovering', PHYSICS.RECOVER_DURATION_MS);
      }
      if (state === 'recovering' && !locked) transitionTo('wander');
      if (state === 'thrown'     && !locked && magnitude(v) < PHYSICS.FLIGHT_RESUME) transitionTo('wander');

      if (Math.abs(v.x) > 5)
        facingRef.current = dialogueActiveRef.current ? 'forward' : (v.x > 0 ? 'right' : 'left');
    }

    else if (state === 'click_react') {
      v.x *= Math.pow(0.85, dt);
      v.y *= Math.pow(0.85, dt);
      if (!locked) transitionTo('wander');
    }

    else if (state === 'bubble_ack') {
      v.x *= Math.pow(0.8, dt);
      v.y *= Math.pow(0.8, dt);
      if (!locked) {
        transitionTo(dialogueActiveRef.current ? 'dialogue' : 'wander');
      }
    }

    else if (state === 'dialogue') {
      v.x *= Math.pow(0.7, dt);
      v.y *= Math.pow(0.7, dt);
      facingRef.current = 'forward';
      if (!dialogueActiveRef.current) {
        facingRef.current = vel.current.x >= 0 ? 'right' : 'left';
        transitionTo('wander');
      }
    }

    else if (state === 'goal_thinking') {
      v.x *= Math.pow(0.8, dt);
      v.y *= Math.pow(0.8, dt);
      if (!locked && now >= goalThinkEndRef.current) {
        transitionTo('goal_travel');
      }
    }

    else if (state === 'goal_travel') {
      const dest = goalDestRef.current;
      if (!dest) { transitionTo('wander'); }
      else {
        const toDest = { x: dest.x - p.x, y: dest.y - p.y };
        const distToDest = magnitude(toDest);
        if (distToDest < PHYSICS.GOAL_ARRIVAL_RADIUS) {
          goalArriveEndRef.current = now + randBetween(PHYSICS.GOAL_ARRIVE_MIN, PHYSICS.GOAL_ARRIVE_MAX);
          goalDestRef.current = null;
          transitionTo('goal_arrived');
        } else {
          const travelSpeed = maxSpeed * PHYSICS.GOAL_TRAVEL_SPEED_MULT;
          const destNorm = normalize(toDest);
          const steer = clampVec2(
            { x: destNorm.x * travelSpeed - v.x, y: destNorm.y * travelSpeed - v.y },
            PHYSICS.MAX_FORCE * PHYSICS.GOAL_TRAVEL_SPEED_MULT,
          );
          noiseT.current += dt * 1000;
          const nx = noise2D.current(noiseT.current * noiseFreq, 0.7);
          const ny = noise2D.current(0.7, noiseT.current * noiseFreq);
          const noiseF = {
            x: nx * PHYSICS.MAX_FORCE * PHYSICS.GOAL_TRAVEL_NOISE_STRENGTH,
            y: ny * PHYSICS.MAX_FORCE * PHYSICS.GOAL_TRAVEL_NOISE_STRENGTH,
          };
          const margin = PHYSICS.EDGE_AVOID_MARGIN;
          const edgeFx =
            (p.x - mb.x < margin            ? PHYSICS.EDGE_REPULSE * (1 - (p.x - mb.x) / margin) : 0) +
            ((mb.x + mb.width) - (p.x + sz) < margin ? -PHYSICS.EDGE_REPULSE * (1 - ((mb.x + mb.width) - (p.x + sz)) / margin) : 0);
          const edgeFy =
            (p.y - mb.y < margin             ? PHYSICS.EDGE_REPULSE * (1 - (p.y - mb.y) / margin) : 0) +
            ((mb.y + mb.height) - (p.y + sz) < margin ? -PHYSICS.EDGE_REPULSE * (1 - ((mb.y + mb.height) - (p.y + sz)) / margin) : 0);
          v.x += (steer.x + noiseF.x + edgeFx) * dt;
          v.y += (steer.y + noiseF.y + edgeFy) * dt;
          const clamped = clampVec2(v, travelSpeed);
          v.x = clamped.x; v.y = clamped.y;
          if (Math.abs(v.x) > 5) facingRef.current = v.x > 0 ? 'right' : 'left';
        }
      }
    }

    else if (state === 'goal_arrived') {
      v.x *= Math.pow(0.8, dt);
      v.y *= Math.pow(0.8, dt);
      if (!locked && now >= goalArriveEndRef.current) {
        goalTimerRef.current = randBetween(PHYSICS.GOAL_INTERVAL_MIN, PHYSICS.GOAL_INTERVAL_MAX);
        transitionTo('wander');
      }
    }

    else if (state === 'goal_interrupted') {
      const target = {
        x: cursorPosRef.current.x - dragOffsetRef.current.x,
        y: cursorPosRef.current.y - dragOffsetRef.current.y,
      };
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      v.x += (PHYSICS.TETHER_STIFFNESS * dx - PHYSICS.TETHER_DAMPING * v.x) * dt;
      v.y += (PHYSICS.TETHER_STIFFNESS * dy - PHYSICS.TETHER_DAMPING * v.y) * dt;
      const clampedV = clampVec2(v, PHYSICS.TETHER_MAX_SPEED);
      v.x = clampedV.x; v.y = clampedV.y;
      p.x += v.x * dt;
      p.y += v.y * dt;
      if (!locked) transitionTo('tether_grab');
    }

    else if (state === 'flee') {
      // Single window — no adjacent monitors. Flee to farthest corner then perch.
      const pcx = p.x + sz / 2;
      const pcy = p.y + sz / 2;
      const corners = [
        { x: mb.x, y: mb.y },
        { x: mb.x + mb.width - sz, y: mb.y },
        { x: mb.x, y: mb.y + mb.height - sz },
        { x: mb.x + mb.width - sz, y: mb.y + mb.height - sz },
      ];
      let farthest = corners[0];
      let maxDist = 0;
      for (const c of corners) {
        const d = Math.abs(c.x - pcx) + Math.abs(c.y - pcy);
        if (d > maxDist) { maxDist = d; farthest = c; }
      }
      if (magnitude(v) < 10) {
        const toCorner = normalize({ x: farthest.x - p.x, y: farthest.y - p.y });
        v.x = toCorner.x * PHYSICS.FLEE_SPEED;
        v.y = toCorner.y * PHYSICS.FLEE_SPEED;
      }
      v.x *= Math.pow(0.85, dt);
      v.y *= Math.pow(0.85, dt);
      if (magnitude(v) < 10) {
        perchSurfaceRef.current = 'bottom';
        snapToSurface('bottom', sz, mb);
        transitionTo('perching');
      }
      if (Math.abs(v.x) > 5) facingRef.current = v.x > 0 ? 'right' : 'left';
    }

    else if (state === 'tether_grab') {
      const target = {
        x: cursorPosRef.current.x - dragOffsetRef.current.x,
        y: cursorPosRef.current.y - dragOffsetRef.current.y,
      };
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const fx = PHYSICS.TETHER_STIFFNESS * dx - PHYSICS.TETHER_DAMPING * v.x;
      const fy = PHYSICS.TETHER_STIFFNESS * dy - PHYSICS.TETHER_DAMPING * v.y;
      v.x += fx * dt;
      v.y += fy * dt;
      const clampedV = clampVec2(v, PHYSICS.TETHER_MAX_SPEED);
      v.x = clampedV.x; v.y = clampedV.y;
      p.x += v.x * dt;
      p.y += v.y * dt;
      if (!dialogueActiveRef.current && Math.abs(v.x) > 5) {
        facingRef.current = v.x > 0 ? 'right' : 'left';
      }
    }

    // ── Direction tracking ────────────────────────────────────────────────────
    {
      const spd = magnitude(v);
      let ideal = 0;
      if (spd >= 8) {
        const ratio = Math.abs(v.x) / spd;
        if (ratio >= 0.15) {
          if (v.x > 0) ideal = ratio < 0.65 ? 1 : 2;
          else          ideal = ratio < 0.65 ? 7 : 6;
        }
      }
      if (ideal === dirLastIdealRef.current) {
        dirHoldMsRef.current += dt * 1000;
      } else {
        dirLastIdealRef.current = ideal;
        dirHoldMsRef.current = 0;
      }
      if (dirHoldMsRef.current >= PHYSICS.DIR_COMMIT_MS) {
        committedDirRef.current = ideal;
        if (committedDirRef.current !== lastSyncedDirRef.current) {
          lastSyncedDirRef.current = committedDirRef.current;
          setCommittedDirR(committedDirRef.current);
        }
      }
    }

    // ── Integrate position ────────────────────────────────────────────────────
    if (state !== 'perching' && state !== 'thrown' && state !== 'stunned' && state !== 'recovering' && state !== 'tether_grab' && state !== 'goal_interrupted') {
      p.x += v.x * dt;
      p.y += v.y * dt;
    }

    // ── Hard wall collision (flight states only) ──────────────────────────────
    if (state !== 'perching' && state !== 'approach' &&
        state !== 'thrown' && state !== 'stunned' && state !== 'recovering' &&
        state !== 'tether_grab' && state !== 'goal_interrupted' && state !== 'flee') {
      const speed = magnitude(v);
      if (p.x + sz > mb.x + mb.width) {
        p.x = mb.x + mb.width - sz;
        v.x *= -PHYSICS.RESTITUTION;
        if (speed > PHYSICS.STUN_VELOCITY && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
        if (Math.abs(v.x) < PHYSICS.MIN_BOUNCE_SPEED) v.x = 0;
      }
      if (p.x < mb.x) {
        p.x = mb.x;
        v.x *= -PHYSICS.RESTITUTION;
        if (speed > PHYSICS.STUN_VELOCITY && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
        if (Math.abs(v.x) < PHYSICS.MIN_BOUNCE_SPEED) v.x = 0;
      }
      if (p.y + sz > mb.y + mb.height) {
        p.y = mb.y + mb.height - sz;
        v.y *= -PHYSICS.RESTITUTION;
        if (speed > PHYSICS.STUN_VELOCITY && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
        if (Math.abs(v.y) < PHYSICS.MIN_BOUNCE_SPEED) v.y = 0;
      }
      if (p.y < mb.y) {
        p.y = mb.y;
        v.y *= -PHYSICS.RESTITUTION;
        if (speed > PHYSICS.STUN_VELOCITY && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
        if (Math.abs(v.y) < PHYSICS.MIN_BOUNCE_SPEED) v.y = 0;
      }
    }

    // Safety clamp to work area
    p.x = clamp(p.x, mb.x, mb.x + mb.width - sz);
    p.y = clamp(p.y, mb.y, mb.y + mb.height - sz);

    updateTransform();
    scheduleSave(p.x, p.y);
    scheduleReactSync();
  }

  // ── Init ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const wa = platform.getWorkArea();
    workAreaRef.current = wa;
    setWorkArea(wa);

    const sz = SPRITE_SIZE;
    const saved = platform.loadPosition();
    if (saved) {
      pos.current = {
        x: clamp(saved.x * wa.width + wa.x, wa.x, wa.x + wa.width - sz),
        y: clamp(saved.y * wa.height + wa.y, wa.y, wa.y + wa.height - sz),
      };
    } else {
      pos.current = { x: wa.x + wa.width - sz - 16, y: wa.y + wa.height - sz - 16 };
    }

    updateTransform();
    lastTickRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);

    function onResize() {
      const newWa = platform.getWorkArea();
      workAreaRef.current = newWa;
      setWorkArea(newWa);
      // Re-clamp position to new bounds
      pos.current.x = clamp(pos.current.x, newWa.x, newWa.x + newWa.width - sz);
      pos.current.y = clamp(pos.current.y, newWa.y, newWa.y + newWa.height - sz);
    }

    function onPointerMove(e: PointerEvent) {
      const now = performance.now();
      const prev = lastCursorRef.current;
      const dt = (now - prev.t) / 1000;
      if (dt > 0) {
        cursorVelRef.current = {
          x: (e.clientX - prev.pos.x) / dt,
          y: (e.clientY - prev.pos.y) / dt,
        };
      }
      cursorPosRef.current = { x: e.clientX, y: e.clientY };
      lastCursorRef.current = { pos: { x: e.clientX, y: e.clientY }, t: now };
    }

    function onWindowPointerUp(e: PointerEvent) {
      if (e.button !== 0 || !isDraggingRef.current) return;
      isDraggingRef.current = false;
      setDragSquishR({ x: 1, y: 1 });
      pointerHistoryRef.current = [];
      vel.current = {
        x: clamp(vel.current.x, -PHYSICS.THROW_MAX_SPEED, PHYSICS.THROW_MAX_SPEED),
        y: clamp(vel.current.y, -PHYSICS.THROW_MAX_SPEED, PHYSICS.THROW_MAX_SPEED),
      };
      transitionTo('thrown', 500);
    }

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (reactSyncTimerRef.current) clearTimeout(reactSyncTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Interaction callbacks ─────────────────────────────────────────────────────

  const setWispState = useCallback((s: WispState) => {
    wispStateRef.current = s;
  }, []);

  const setDialogue = useCallback((visible: boolean) => {
    dialogueActiveRef.current = visible;
    if (visible) {
      facingRef.current = 'forward';
      const cur = stateRef.current;
      if (cur !== 'grabbed' && cur !== 'tether_grab' && cur !== 'perching' && cur !== 'land_impact') {
        transitionTo('dialogue');
        vel.current.x *= 0.2;
        vel.current.y *= 0.2;
      }
    } else {
      facingRef.current = vel.current.x >= 0 ? 'right' : 'left';
      if (stateRef.current === 'dialogue') transitionTo('wander');
    }
    scheduleReactSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifyBubbleClick = useCallback(() => {
    transitionTo('bubble_ack', PHYSICS.BUBBLE_ACK_DURATION_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifySingleClick = useCallback((cx: number, cy: number) => {
    const cur = stateRef.current;
    if (cur === 'thrown' || cur === 'stunned' || cur === 'recovering') return;
    if (cur === 'perching') { triggerRelaunch(); return; }
    const p = pos.current;
    const sz = SPRITE_SIZE;
    const dir = normalize({ x: (p.x + sz / 2) - cx, y: (p.y + sz / 2) - cy });
    const wispSt = wispStateRef.current;
    const mult = (wispSt === 'focus' || wispSt === 'deep') ? 0.4 : 1.0;
    vel.current.x += dir.x * PHYSICS.CLICK_IMPULSE * mult;
    vel.current.y += dir.y * PHYSICS.CLICK_IMPULSE * mult;
    transitionTo('click_react', PHYSICS.CLICK_REACT_DURATION_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifyDragStart = useCallback((clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = { x: clientX - pos.current.x, y: clientY - pos.current.y };
    pointerHistoryRef.current = [];

    const cur = stateRef.current;
    if (cur === 'goal_thinking' || cur === 'goal_travel') {
      goalDestRef.current = null;
      transitionTo('goal_interrupted', PHYSICS.GOAL_INTERRUPTED_MS);
    } else {
      transitionTo('tether_grab');
    }
    setDragSquishR({ x: PHYSICS.SQUISH_ON_GRAB_X, y: PHYSICS.SQUISH_ON_GRAB_Y });
    setTimeout(() => setDragSquishR({ x: 1, y: 1 }), 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifyDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const now = performance.now();
    pointerHistoryRef.current.push({ x: clientX, y: clientY, t: now });
    while (
      pointerHistoryRef.current.length > 0 &&
      now - pointerHistoryRef.current[0].t > 100
    ) pointerHistoryRef.current.shift();

    const hist = pointerHistoryRef.current;
    if (hist.length >= 2) {
      const last = hist[hist.length - 1];
      const first = hist[0];
      const dtS = (last.t - first.t) / 1000;
      if (dtS > 0) {
        const speed = magnitude({ x: (last.x - first.x) / dtS, y: (last.y - first.y) / dtS });
        const stretch = clamp(speed / 400, 0, 1);
        setDragSquishR({
          x: lerp(1, PHYSICS.STRETCH_MAX, stretch),
          y: lerp(1, PHYSICS.STRETCH_COMPRESS_MIN, stretch),
        });
        if (!dialogueActiveRef.current) {
          facingRef.current = (last.x - first.x) >= 0 ? 'right' : 'left';
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifyDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setDragSquishR({ x: 1, y: 1 });
    pointerHistoryRef.current = [];
    vel.current = {
      x: clamp(vel.current.x, -PHYSICS.THROW_MAX_SPEED, PHYSICS.THROW_MAX_SPEED),
      y: clamp(vel.current.y, -PHYSICS.THROW_MAX_SPEED, PHYSICS.THROW_MAX_SPEED),
    };
    transitionTo('thrown', 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    elementRef,
    physicsState,
    facing,
    velocity,
    dragSquish,
    workArea,
    spriteSize,
    committedDir,
    setWispState,
    setDialogue,
    notifyBubbleClick,
    notifySingleClick,
    notifyDragStart,
    notifyDragMove,
    notifyDragEnd,
  };
}
