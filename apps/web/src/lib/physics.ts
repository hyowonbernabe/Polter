import type { WispState } from './platform';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PhysicsState =
  | 'wander'
  | 'fly_idle'
  | 'glide'
  | 'burst'
  | 'hover'
  | 'evade'
  | 'approach'
  | 'land_impact'
  | 'perching'
  | 'relaunch'
  | 'grabbed'
  | 'tether_grab'
  | 'thrown'
  | 'stunned'
  | 'recovering'
  | 'click_react'
  | 'bubble_ack'
  | 'dialogue'
  | 'goal_thinking'
  | 'goal_travel'
  | 'goal_arrived'
  | 'goal_interrupted'
  | 'flee';

export type PerchSurface   = 'bottom' | 'top' | 'left' | 'right';
export type FacingDirection = 'left' | 'right' | 'forward';

export interface Vec2      { x: number; y: number; }
export interface WorkArea  { x: number; y: number; width: number; height: number; }

// ── Physics constants ─────────────────────────────────────────────────────────

export const PHYSICS = {
  MAX_SPEED: 80,
  MAX_FORCE: 120,
  NOISE_FREQ: 0.0005,
  COAST_DRAG: 0.92,
  HOVER_THRESHOLD: 20,
  FLIGHT_RESUME: 60,
  STUN_VELOCITY: 250,
  MIN_BOUNCE_SPEED: 15,
  RESTITUTION: 0.55,
  EDGE_AVOID_MARGIN: 80,
  EDGE_REPULSE: 160,
  BURST_SPEED_MULT: 1.8,
  BURST_DURATION_MS: 150,
  BURST_INTERVAL_MIN: 1200,
  BURST_INTERVAL_MAX: 2400,
  LAND_DISTANCE: 8,
  LAND_TIMER_MIN: 45_000,
  LAND_TIMER_MAX: 120_000,
  LAND_IMPACT_DURATION: 300,
  APPROACH_SPEED: 60,
  PERCH_TIMER_MIN: 4_000,
  PERCH_TIMER_MAX: 20_000,
  RELAUNCH_SPEED: 280,
  FLY_IDLE_DURATION_MIN: 800,
  FLY_IDLE_DURATION_MAX: 3000,
  FLY_IDLE_INTERVAL_MIN: 8_000,
  FLY_IDLE_INTERVAL_MAX: 25_000,
  CENTER_PULL: 8,
  CURSOR_AVOID_RADIUS: 250,
  CURSOR_REPULSE: 300,
  CURSOR_EDGE_MARGIN: 60,
  FAST_CURSOR_THRESHOLD: 200,
  CLICK_IMPULSE: 180,
  SAVE_DEBOUNCE_MS: 2000,
  STUN_DURATION_MS: 800,
  RECOVER_DURATION_MS: 600,
  CLICK_REACT_DURATION_MS: 500,
  BUBBLE_ACK_DURATION_MS: 400,
  RELAUNCH_DURATION_MS: 300,
  GOAL_INTERRUPTED_MS: 150,
  GOAL_INTERVAL_MIN: 3 * 60_000,
  GOAL_INTERVAL_MAX: 8 * 60_000,
  GOAL_THINKING_MIN: 1_000,
  GOAL_THINKING_MAX: 2_000,
  GOAL_TRAVEL_SPEED_MULT: 1.5,
  GOAL_TRAVEL_NOISE_STRENGTH: 0.3,
  GOAL_ARRIVAL_RADIUS: 40,
  GOAL_ARRIVE_MIN: 4_000,
  GOAL_ARRIVE_MAX: 10_000,
  GOAL_EDGE_MARGIN: 100,
  FLEE_STARTLE_MS: 400,
  FLEE_SPEED: 400,
  DIR_COMMIT_MS: 50,
  SQUISH_ON_GRAB_X: 0.8,
  SQUISH_ON_GRAB_Y: 1.2,
  STRETCH_MAX: 1.35,
  STRETCH_COMPRESS_MIN: 0.75,
  TETHER_STIFFNESS: 300,
  TETHER_DAMPING: 28,
  TETHER_MAX_SPEED: 3000,
  THROW_MAX_SPEED: 3000,
} as const;

// ── Mood modifiers ────────────────────────────────────────────────────────────

export interface MoodMod {
  speedMult:  number;
  freqMult:   number;
  coastMult:  number;
  landBias:   number;
}

export const MOOD_MODIFIERS: Record<WispState, MoodMod> = {
  calm:  { speedMult: 0.7,  freqMult: 0.7,  coastMult: 1.3,  landBias: 1.3 },
  focus: { speedMult: 1.0,  freqMult: 1.0,  coastMult: 1.0,  landBias: 1.0 },
  deep:  { speedMult: 0.85, freqMult: 0.8,  coastMult: 1.15, landBias: 1.0 },
  spark: { speedMult: 1.4,  freqMult: 1.5,  coastMult: 0.7,  landBias: 0.5 },
  burn:  { speedMult: 1.2,  freqMult: 1.3,  coastMult: 0.8,  landBias: 0.8 },
  fade:  { speedMult: 0.5,  freqMult: 0.5,  coastMult: 1.8,  landBias: 2.0 },
  rest:  { speedMult: 0.3,  freqMult: 0.4,  coastMult: 2.5,  landBias: 3.0 },
};

// ── Pure math helpers ─────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function magnitude(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function clampVec2(v: Vec2, maxMag: number): Vec2 {
  const mag = magnitude(v);
  if (mag <= maxMag) return v;
  const n = normalize(v);
  return { x: n.x * maxMag, y: n.y * maxMag };
}
