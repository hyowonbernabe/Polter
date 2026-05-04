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
    if (now - lastBoundsUpdateRef.current < 60) return;
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

    if (state === 'grabbed') return;

    const p = pos.current;
    const v = vel.current;
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

      // Screen-center gravity
      const cx = wa.x + wa.width / 2;
      const cy = wa.y + wa.height / 2;
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

      // Soft edge avoidance
      const margin = PHYSICS.EDGE_AVOID_MARGIN;
      const edgeF = { x: 0, y: 0 };
      if (p.x - wa.x < margin) edgeF.x += PHYSICS.EDGE_REPULSE * (1 - (p.x - wa.x) / margin);
      if ((wa.x + wa.width) - (p.x + sz) < margin) edgeF.x -= PHYSICS.EDGE_REPULSE * (1 - ((wa.x + wa.width) - (p.x + sz)) / margin);
      if (p.y - wa.y < margin) edgeF.y += PHYSICS.EDGE_REPULSE * (1 - (p.y - wa.y) / margin);
      if ((wa.y + wa.height) - (p.y + sz) < margin) edgeF.y -= PHYSICS.EDGE_REPULSE * (1 - ((wa.y + wa.height) - (p.y + sz)) / margin);

      v.x += (steer.x + centerF.x + cursorF.x + edgeF.x) * dt;
      v.y += (steer.y + centerF.y + cursorF.y + edgeF.y) * dt;
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
        surface === 'bottom' ? (wa.y + wa.height) - (p.y + sz) < PHYSICS.LAND_DISTANCE :
        surface === 'top'    ? p.y - wa.y < PHYSICS.LAND_DISTANCE :
        surface === 'left'   ? p.x - wa.x < PHYSICS.LAND_DISTANCE :
        (wa.x + wa.width) - (p.x + sz) < PHYSICS.LAND_DISTANCE;
      if (nearSurface) {
        v.x = 0; v.y = 0;
        snapToSurface(surface, sz, wa);
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
      snapToSurface(perchSurfaceRef.current, sz, wa);
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

      // Wall bounce
      const BOUNCE = 0.55;
      if (p.x < wa.x) {
        p.x = wa.x;
        v.x = Math.abs(v.x) * BOUNCE;
        if (state === 'thrown' && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
      }
      if (p.x + sz > wa.x + wa.width) {
        p.x = wa.x + wa.width - sz;
        v.x = -Math.abs(v.x) * BOUNCE;
        if (state === 'thrown' && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
      }
      if (p.y < wa.y) {
        p.y = wa.y;
        v.y = Math.abs(v.y) * BOUNCE;
        if (state === 'thrown' && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
      }
      if (p.y + sz > wa.y + wa.height) {
        p.y = wa.y + wa.height - sz;
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

    // ── Integrate position ────────────────────────────────────────────────────

    // Ballistic states handle their own position + wall bounce above
    if (state !== 'perching' && state !== 'thrown' && state !== 'stunned' && state !== 'recovering') {
      p.x += v.x * dt;
      p.y += v.y * dt;
    }

    // ── Hard wall collision (custom flight states only) ────────────────────────

    if (state !== 'perching' && state !== 'approach' &&
        state !== 'thrown' && state !== 'stunned' && state !== 'recovering') {
      const speed = magnitude(v);
      if (p.x + sz > wa.x + wa.width) {
        p.x = wa.x + wa.width - sz;
        v.x *= -PHYSICS.RESTITUTION;
        if (speed > PHYSICS.STUN_VELOCITY && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
        if (Math.abs(v.x) < PHYSICS.MIN_BOUNCE_SPEED) v.x = 0;
      }
      if (p.x < wa.x) {
        p.x = wa.x;
        v.x *= -PHYSICS.RESTITUTION;
        if (speed > PHYSICS.STUN_VELOCITY && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
        if (Math.abs(v.x) < PHYSICS.MIN_BOUNCE_SPEED) v.x = 0;
      }
      if (p.y + sz > wa.y + wa.height) {
        p.y = wa.y + wa.height - sz;
        v.y *= -PHYSICS.RESTITUTION;
        if (speed > PHYSICS.STUN_VELOCITY && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
        if (Math.abs(v.y) < PHYSICS.MIN_BOUNCE_SPEED) v.y = 0;
      }
      if (p.y < wa.y) {
        p.y = wa.y;
        v.y *= -PHYSICS.RESTITUTION;
        if (speed > PHYSICS.STUN_VELOCITY && !locked) transitionTo('stunned', PHYSICS.STUN_DURATION_MS);
        if (Math.abs(v.y) < PHYSICS.MIN_BOUNCE_SPEED) v.y = 0;
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
    window.addEventListener('pointermove', onPointerMove);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('pointermove', onPointerMove);
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
      if (cur !== 'grabbed' && cur !== 'perching' && cur !== 'land_impact') {
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
    transitionTo('grabbed');
    setDragSquishR({ x: PHYSICS.SQUISH_ON_GRAB_X, y: PHYSICS.SQUISH_ON_GRAB_Y });
    setTimeout(() => setDragSquishR({ x: 1, y: 1 }), 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifyDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const now = performance.now();
    pos.current = { x: clientX - dragOffsetRef.current.x, y: clientY - dragOffsetRef.current.y };
    updateTransform();
    scheduleBoundsUpdate(pos.current.x, pos.current.y, spriteSizeRef.current, spriteSizeRef.current);

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

    const hist = pointerHistoryRef.current;
    let throwVx = 0, throwVy = 0;
    if (hist.length >= 2) {
      const last  = hist[hist.length - 1];
      // Use last 40ms so a fast flick reads correctly instead of being averaged down
      const cutoff = last.t - 40;
      const first  = hist.find(p => p.t >= cutoff) ?? hist[0];
      const dtS    = (last.t - first.t) / 1000;
      if (dtS > 0.005) {
        throwVx = clamp((last.x - first.x) / dtS, -1400, 1400);
        throwVy = clamp((last.y - first.y) / dtS, -1400, 1400);
      }
    }
    vel.current = { x: throwVx, y: throwVy };
    pointerHistoryRef.current = [];

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
