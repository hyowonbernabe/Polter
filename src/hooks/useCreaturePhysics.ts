import { useCallback, useEffect, useRef, useState } from 'react';
import { createNoise2D } from 'simplex-noise';
import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
import {
  PHYSICS, MOOD_MODIFIERS,
  type PhysicsState, type PerchSurface, type FacingDirection, type Vec2, type WorkArea,
  clamp, normalize, magnitude, clampVec2, randBetween, lerp,
} from '../lib/physics';
import { type WispState } from '../lib/spriteConfig';
import {
  spriteDisplaySize, clampToMonitors,
  type MonitorInfo,
} from './useCreaturePosition';

const STORE_FILE = 'wisp-settings.json';
const POS_KEY = 'creature_position';

export interface PhysicsOutput {
  elementRef: React.RefObject<HTMLDivElement>;
  physicsState: PhysicsState;
  facing: FacingDirection;
  velocity: Vec2;
  dragSquish: Vec2;
  workArea: WorkArea;
  monitors: MonitorInfo[];
  spriteSize: number;
  setWispState: (s: WispState) => void;
  setDialogue: (visible: boolean) => void;
  notifyBubbleClick: () => void;
  notifySingleClick: (cx: number, cy: number) => void;
  notifyDragStart: (clientX: number, clientY: number) => void;
  notifyDragMove: (clientX: number, clientY: number) => void;
  notifyDragEnd: () => void;
}

export function useCreaturePhysics(): PhysicsOutput {
  const elementRef = useRef<HTMLDivElement>(null);

  // ── React state — only for things the render tree actually reads ─────────────
  const [physicsState, setPhysicsStateR] = useState<PhysicsState>('wander');
  const [facing, setFacingR] = useState<FacingDirection>('right');
  const [velocity, setVelocityR] = useState<Vec2>({ x: 0, y: 0 });
  const [dragSquish, setDragSquishR] = useState<Vec2>({ x: 1, y: 1 });
  const [workArea, setWorkArea] = useState<WorkArea>({ x: 0, y: 0, width: 1920, height: 1080 });
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [spriteSize, setSpriteSizeR] = useState<number>(() => spriteDisplaySize());

  // ── Physics refs — mutated in rAF, never trigger renders ─────────────────────
  const pos = useRef<Vec2>({ x: 200, y: 200 });
  const vel = useRef<Vec2>({ x: 40, y: -20 });
  const stateRef = useRef<PhysicsState>('wander');
  const facingRef = useRef<FacingDirection>('right');
  const workAreaRef = useRef<WorkArea>({ x: 0, y: 0, width: 1920, height: 1080 });
  const monitorsRef = useRef<MonitorInfo[]>([]);
  const wispStateRef = useRef<WispState>('calm');
  const spriteSizeRef = useRef<number>(spriteDisplaySize());

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

  // Cursor
  const cursorPosRef = useRef<Vec2>({ x: 0, y: 0 });
  const cursorVelRef = useRef<Vec2>({ x: 0, y: 0 });
  const lastCursorRef = useRef<{ pos: Vec2; t: number }>({ pos: { x: 0, y: 0 }, t: 0 });

  // Drag
  const isDraggingRef = useRef<boolean>(false);
  const dragOffsetRef = useRef<Vec2>({ x: 0, y: 0 });
  const pointerHistoryRef = useRef<Array<{ x: number; y: number; t: number }>>([]);

  // Persistence
  const storeRef = useRef<Store | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBoundsUpdateRef = useRef<number>(0);

  // rAF
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  // React state sync — throttled so 60fps physics doesn't cause 60 renders/s
  const reactSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  // True if the given side of `mb` has no adjacent monitor — i.e. it's a true outer edge
  function isOuterEdge(mb: WorkArea, side: 'left' | 'right' | 'top' | 'bottom'): boolean {
    const TOL = 8;
    return !monitorsRef.current.some(m => {
      if (m.x === mb.x && m.y === mb.y && m.width === mb.width && m.height === mb.height) return false;
      switch (side) {
        case 'left':   return Math.abs((m.x + m.width) - mb.x) <= TOL && m.y < mb.y + mb.height && m.y + m.height > mb.y;
        case 'right':  return Math.abs(m.x - (mb.x + mb.width)) <= TOL && m.y < mb.y + mb.height && m.y + m.height > mb.y;
        case 'top':    return Math.abs((m.y + m.height) - mb.y) <= TOL && m.x < mb.x + mb.width && m.x + m.width > mb.x;
        case 'bottom': return Math.abs(m.y - (mb.y + mb.height)) <= TOL && m.x < mb.x + mb.width && m.x + m.width > mb.x;
      }
    });
  }

  function transitionTo(next: PhysicsState, lockMs = 0) {
    stateRef.current = next;
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
    saveTimerRef.current = setTimeout(async () => {
      const wa = workAreaRef.current;
      if (!storeRef.current || wa.width === 0) return;
      const xPct = (x - wa.x) / wa.width;
      const yPct = (y - wa.y) / wa.height;
      await storeRef.current.set(POS_KEY, { xPct, yPct });
      await storeRef.current.save();
    }, PHYSICS.SAVE_DEBOUNCE_MS);
  }

  function scheduleBoundsUpdate(x: number, y: number, w: number, h: number) {
    const now = performance.now();
    const throttle = stateRef.current === 'tether_grab' ? 16 : 60;
    if (now - lastBoundsUpdateRef.current < throttle) return;
    lastBoundsUpdateRef.current = now;
    invoke('set_creature_bounds', { x, y, width: w, height: h }).catch(() => {});
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
    const sz = spriteSizeRef.current;
    const locked = now < lockedUntilRef.current;
    const mood = getMoodMod();

    if (state === 'grabbed') return; // legacy no-op

    const p = pos.current;
    const v = vel.current;

    // Resolve the monitor the creature is currently on — all collision uses this, not the combined wa
    const pcx = p.x + sz / 2;
    const pcy = p.y + sz / 2;
    const mb: WorkArea = monitorsRef.current.find(
      m => pcx >= m.x && pcx <= m.x + m.width && pcy >= m.y && pcy <= m.y + m.height
    ) ?? (() => {
      let best = monitorsRef.current[0];
      if (!best) return wa;
      let bestDist = Infinity;
      for (const m of monitorsRef.current) {
        const d = Math.abs(pcx - (m.x + m.width / 2)) + Math.abs(pcy - (m.y + m.height / 2));
        if (d < bestDist) { bestDist = d; best = m; }
      }
      return best;
    })();
    const maxSpeed = PHYSICS.MAX_SPEED * mood.speedMult;
    const noiseFreq = PHYSICS.NOISE_FREQ * mood.freqMult;

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

      // Screen-center gravity (toward current monitor center)
      const cx = mb.x + mb.width / 2;
      const cy = mb.y + mb.height / 2;
      const toCenterN = normalize({ x: cx - (p.x + sz / 2), y: cy - (p.y + sz / 2) });
      const centerF = { x: toCenterN.x * PHYSICS.CENTER_PULL, y: toCenterN.y * PHYSICS.CENTER_PULL };

      // Cursor influence
      const cursorSpeed = magnitude(cursorVelRef.current);
      let cursorF = { x: 0, y: 0 };
      if (cursorSpeed < PHYSICS.SLOW_CURSOR_THRESHOLD) {
        const toCursor = normalize({
          x: cursorPosRef.current.x - (p.x + sz / 2),
          y: cursorPosRef.current.y - (p.y + sz / 2),
        });
        cursorF = { x: toCursor.x * PHYSICS.CURSOR_ATTRACT, y: toCursor.y * PHYSICS.CURSOR_ATTRACT };
      } else if (cursorSpeed > PHYSICS.FAST_CURSOR_THRESHOLD && !locked) {
        transitionTo('evade');
      }

      // Soft edge avoidance — only at outer edges (no adjacent monitor on that side)
      const margin = PHYSICS.EDGE_AVOID_MARGIN;
      let edgeFx = 0, edgeFy = 0;
      const repLeft   = isOuterEdge(mb, 'left')   && p.x - mb.x < margin            ? PHYSICS.EDGE_REPULSE * (1 - (p.x - mb.x) / margin) : 0;
      const repRight  = isOuterEdge(mb, 'right')  && (mb.x + mb.width) - (p.x + sz) < margin ? -PHYSICS.EDGE_REPULSE * (1 - ((mb.x + mb.width) - (p.x + sz)) / margin) : 0;
      const repTop    = isOuterEdge(mb, 'top')    && p.y - mb.y < margin             ? PHYSICS.EDGE_REPULSE * (1 - (p.y - mb.y) / margin) : 0;
      const repBottom = isOuterEdge(mb, 'bottom') && (mb.y + mb.height) - (p.y + sz) < margin ? -PHYSICS.EDGE_REPULSE * (1 - ((mb.y + mb.height) - (p.y + sz)) / margin) : 0;

      // Cursor edge following: detect edges relative to the monitor the cursor is on
      const em = PHYSICS.CURSOR_EDGE_MARGIN;
      const cpx = cursorPosRef.current.x;
      const cpy = cursorPosRef.current.y;
      const cursorMon = monitorsRef.current.find(
        m => cpx >= m.x && cpx <= m.x + m.width && cpy >= m.y && cpy <= m.y + m.height
      ) ?? monitorsRef.current[0] ?? wa;
      const cursorNearLeft   = cpx - cursorMon.x < em;
      const cursorNearRight  = (cursorMon.x + cursorMon.width)  - cpx < em;
      const cursorNearTop    = cpy - cursorMon.y < em;
      const cursorNearBottom = (cursorMon.y + cursorMon.height) - cpy < em;
      const cursorOnEdge = cursorNearLeft || cursorNearRight || cursorNearTop || cursorNearBottom;

      edgeFx += cursorNearLeft  ? 0 : repLeft;
      edgeFx += cursorNearRight ? 0 : repRight;
      edgeFy += cursorNearTop   ? 0 : repTop;
      edgeFy += cursorNearBottom ? 0 : repBottom;

      let edgeFollowFx = 0, edgeFollowFy = 0;
      if (cursorOnEdge) {
        const toCursor = normalize({
          x: cursorPosRef.current.x - (p.x + sz / 2),
          y: cursorPosRef.current.y - (p.y + sz / 2),
        });
        edgeFollowFx = toCursor.x * PHYSICS.CURSOR_EDGE_ATTRACT;
        edgeFollowFy = toCursor.y * PHYSICS.CURSOR_EDGE_ATTRACT;
      }

      v.x += (steer.x + centerF.x + cursorF.x + edgeFx + edgeFollowFx) * dt;
      v.y += (steer.y + centerF.y + cursorF.y + edgeFy + edgeFollowFy) * dt;
      const clamped = clampVec2(v, effectiveMax);
      v.x = clamped.x; v.y = clamped.y;

      if (state === 'glide') {
        const drag = Math.pow(PHYSICS.COAST_DRAG * mood.coastMult, dt);
        v.x *= drag; v.y *= drag;
        if (magnitude(v) < 5) transitionTo('wander');
      }

      // fly_idle trigger
      flyIdleTimerRef.current -= dt * 1000;
      if (!locked && flyIdleTimerRef.current <= 0) {
        flyIdleHoldRef.current = randBetween(PHYSICS.FLY_IDLE_DURATION_MIN, PHYSICS.FLY_IDLE_DURATION_MAX);
        flyIdleTimerRef.current = randBetween(PHYSICS.FLY_IDLE_INTERVAL_MIN, PHYSICS.FLY_IDLE_INTERVAL_MAX);
        transitionTo('fly_idle');
        v.x = 0; v.y = 0;
      }

      // Land timer
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
      if (!locked && magnitude(cursorVelRef.current) < PHYSICS.SLOW_CURSOR_THRESHOLD) {
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
      // ── Ballistic physics: gravity arc + air drag + wall bounce ──────────────
      const GRAVITY  = 1400;               // px/s² downward
      const AIR_DRAG = Math.pow(0.42, dt); // 42 % velocity remaining after 1 s

      if (state !== 'recovering') {
        v.y += GRAVITY * dt;
      }
      v.x *= AIR_DRAG;
      v.y *= AIR_DRAG;

      p.x += v.x * dt;
      p.y += v.y * dt;

      // Wall bounce — only at outer edges (no adjacent monitor on that side)
      const BOUNCE = 0.55;
      if (p.x < mb.x && isOuterEdge(mb, 'left')) {
        p.x = mb.x;
        v.x = Math.abs(v.x) * BOUNCE;
        if (state === 'thrown' && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
      }
      if (p.x + sz > mb.x + mb.width && isOuterEdge(mb, 'right')) {
        p.x = mb.x + mb.width - sz;
        v.x = -Math.abs(v.x) * BOUNCE;
        if (state === 'thrown' && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
      }
      if (p.y < mb.y && isOuterEdge(mb, 'top')) {
        p.y = mb.y;
        v.y = Math.abs(v.y) * BOUNCE;
        if (state === 'thrown' && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
      }
      if (p.y + sz > mb.y + mb.height && isOuterEdge(mb, 'bottom')) {
        p.y = mb.y + mb.height - sz;
        v.y = -Math.abs(v.y) * BOUNCE;
        if (Math.abs(v.y) < 60) v.y = 0;
        if (state === 'thrown' && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
      }

      if (state === 'stunned'    && !locked) transitionTo('recovering', PHYSICS.RECOVER_DURATION_MS);
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

    // ── Integrate position ────────────────────────────────────────────────────

    // Ballistic and tether states handle their own position integration above
    if (state !== 'perching' && state !== 'thrown' && state !== 'stunned' && state !== 'recovering' && state !== 'tether_grab') {
      p.x += v.x * dt;
      p.y += v.y * dt;
    }

    // ── Hard wall collision — only at outer edges (flight states only) ───────────

    if (state !== 'perching' && state !== 'approach' &&
        state !== 'thrown' && state !== 'stunned' && state !== 'recovering' && state !== 'tether_grab') {
      const speed = magnitude(v);
      if (p.x + sz > mb.x + mb.width && isOuterEdge(mb, 'right')) {
        p.x = mb.x + mb.width - sz;
        v.x *= -PHYSICS.RESTITUTION;
        if (speed > PHYSICS.STUN_VELOCITY && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
        if (Math.abs(v.x) < PHYSICS.MIN_BOUNCE_SPEED) v.x = 0;
      }
      if (p.x < mb.x && isOuterEdge(mb, 'left')) {
        p.x = mb.x;
        v.x *= -PHYSICS.RESTITUTION;
        if (speed > PHYSICS.STUN_VELOCITY && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
        if (Math.abs(v.x) < PHYSICS.MIN_BOUNCE_SPEED) v.x = 0;
      }
      if (p.y + sz > mb.y + mb.height && isOuterEdge(mb, 'bottom')) {
        p.y = mb.y + mb.height - sz;
        v.y *= -PHYSICS.RESTITUTION;
        if (speed > PHYSICS.STUN_VELOCITY && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
        if (Math.abs(v.y) < PHYSICS.MIN_BOUNCE_SPEED) v.y = 0;
      }
      if (p.y < mb.y && isOuterEdge(mb, 'top')) {
        p.y = mb.y;
        v.y *= -PHYSICS.RESTITUTION;
        if (speed > PHYSICS.STUN_VELOCITY && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
        if (Math.abs(v.y) < PHYSICS.MIN_BOUNCE_SPEED) v.y = 0;
      }
    }

    // Safety clamp: creature can never escape the combined area of all monitors
    if (monitorsRef.current.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const m of monitorsRef.current) {
        if (m.x < minX) minX = m.x;
        if (m.y < minY) minY = m.y;
        if (m.x + m.width  > maxX) maxX = m.x + m.width;
        if (m.y + m.height > maxY) maxY = m.y + m.height;
      }
      p.x = clamp(p.x, minX, maxX - sz);
      p.y = clamp(p.y, minY, maxY - sz);

      // Escape recovery: if creature ended up in a gap between monitors, teleport to nearest monitor center
      const cx = p.x + sz / 2;
      const cy = p.y + sz / 2;
      const inAnyMonitor = monitorsRef.current.some(
        m => cx >= m.x && cx <= m.x + m.width && cy >= m.y && cy <= m.y + m.height
      );
      if (!inAnyMonitor) {
        let nearest = monitorsRef.current[0];
        let bestDist = Infinity;
        for (const m of monitorsRef.current) {
          const d = Math.abs(cx - (m.x + m.width / 2)) + Math.abs(cy - (m.y + m.height / 2));
          if (d < bestDist) { bestDist = d; nearest = m; }
        }
        p.x = nearest.x + nearest.width / 2 - sz / 2;
        p.y = nearest.y + nearest.height / 2 - sz / 2;
        v.x = 0; v.y = 0;
        if (stateRef.current !== 'tether_grab') transitionTo('wander');
      }
    }

    updateTransform();
    scheduleSave(p.x, p.y);
    scheduleBoundsUpdate(p.x, p.y, sz, sz);
    scheduleReactSync();
  }

  // ── Init ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const wa: WorkArea = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
      workAreaRef.current = wa;
      setWorkArea(wa);

      let mons: MonitorInfo[] = [];
      try { mons = await invoke<MonitorInfo[]>('get_monitors'); }
      catch { mons = [{ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }]; }
      monitorsRef.current = mons;
      setMonitors(mons);

      const sz = spriteDisplaySize();
      spriteSizeRef.current = sz;
      setSpriteSizeR(sz);

      const store = await Store.load(STORE_FILE);
      storeRef.current = store;

      const saved = await store.get<{ xPct: number; yPct: number }>(POS_KEY);
      if (saved) {
        const px = saved.xPct * wa.width + wa.x;
        const py = saved.yPct * wa.height + wa.y;
        const clamped = clampToMonitors(px, py, mons, { w: sz, h: sz });
        pos.current = clamped;
      } else {
        const primary = mons[0] ?? { x: 0, y: 0, width: wa.width, height: wa.height };
        pos.current = { x: primary.x + primary.width - sz - 16, y: primary.y + primary.height - sz - 16 };
      }

      if (!cancelled) {
        updateTransform();
        invoke('set_creature_bounds', { x: pos.current.x, y: pos.current.y, width: sz, height: sz }).catch(() => {});
        lastTickRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    init();

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

    // Safety net: if pointerup fires anywhere on the window while dragging, end the drag.
    // This catches the case where the user releases the button while the cursor is not
    // over the creature element (e.g. after a fast drag where the spring lags behind).
    function onWindowPointerUp(e: PointerEvent) {
      if (e.button !== 0 || !isDraggingRef.current) return;
      isDraggingRef.current = false;
      setDragSquishR({ x: 1, y: 1 });
      pointerHistoryRef.current = [];
      invoke('set_drag_active', { active: false }).catch(() => {});
      vel.current = {
        x: clamp(vel.current.x, -PHYSICS.THROW_MAX_SPEED, PHYSICS.THROW_MAX_SPEED),
        y: clamp(vel.current.y, -PHYSICS.THROW_MAX_SPEED, PHYSICS.THROW_MAX_SPEED),
      };
      transitionTo('thrown', 500);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
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
    // Browser fires click after every pointerup — don't interrupt ballistic flight
    if (cur === 'thrown' || cur === 'stunned' || cur === 'recovering') return;
    if (cur === 'perching') { triggerRelaunch(); return; }
    const p = pos.current;
    const sz = spriteSizeRef.current;
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
    // Keep window fully interactive for the entire drag so pointerup is never swallowed
    invoke('set_drag_active', { active: true }).catch(() => {});
    transitionTo('tether_grab');
    setDragSquishR({ x: PHYSICS.SQUISH_ON_GRAB_X, y: PHYSICS.SQUISH_ON_GRAB_Y });
    setTimeout(() => setDragSquishR({ x: 1, y: 1 }), 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifyDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const now = performance.now();
    // Spring tether: don't teleport pos — physics tick drives the creature toward cursor target.
    // Only track pointer history for the facing direction and stretch visual.
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
    // Restore normal cursor hit-testing now that the drag is over
    invoke('set_drag_active', { active: false }).catch(() => {});

    // Spring velocity at release IS the throw velocity — already reflects the flick momentum.
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
    monitors,
    spriteSize,
    setWispState,
    setDialogue,
    notifyBubbleClick,
    notifySingleClick,
    notifyDragStart,
    notifyDragMove,
    notifyDragEnd,
  };
}
