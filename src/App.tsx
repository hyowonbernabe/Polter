import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import Creature from "./components/Creature";
import { useCreaturePosition } from "./hooks/useCreaturePosition";
import { useIdleDetection } from "./hooks/useIdleDetection";
import { type WispState } from "./lib/spriteConfig";

const BURN_DISTRESS_MS = 90 * 60 * 1_000;
const DEBUG_MONITORS = false;

interface StateChangedPayload {
  state: WispState;
  cold_start: boolean;
}

interface SleepChangedPayload {
  sleeping: boolean;
  privacy: boolean;
}

export default function App() {
  const [wispState, setWispState] = useState<WispState>("rest");
  const [coldStart, setColdStart] = useState(true);
  const [showReturning, setShowReturning] = useState(false);
  const [showBestSession, setShowBestSession] = useState(false);
  const [burnDistress, setBurnDistress] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [showWake, setShowWake] = useState(false);

  const burnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onBoundsChange = useCallback(
    (x: number, y: number, w: number, h: number) => {
      invoke("set_creature_bounds", { x, y, width: w, height: h });
    },
    []
  );

  const { pos, spriteSize, workArea, monitors, updatePosition } = useCreaturePosition(onBoundsChange);
  const idleOpacity = useIdleDetection();

  // Burn distress: arm a 90-min timer when entering burn, cancel on any other state
  useEffect(() => {
    if (burnTimerRef.current !== null) {
      clearTimeout(burnTimerRef.current);
      burnTimerRef.current = null;
    }
    if (wispState === "burn") {
      burnTimerRef.current = setTimeout(() => setBurnDistress(true), BURN_DISTRESS_MS);
    } else {
      setBurnDistress(false);
    }
    return () => {
      if (burnTimerRef.current !== null) {
        clearTimeout(burnTimerRef.current);
        burnTimerRef.current = null;
      }
    };
  }, [wispState]);

  useEffect(() => {
    const unlistenReady = listen<{ version: string }>("wisp_ready", (event) => {
      console.log("[wisp] bridge confirmed, version:", event.payload.version);
    });
    const unlistenState = listen<StateChangedPayload>("state_changed", (event) => {
      setWispState(event.payload.state);
      setColdStart(event.payload.cold_start);
    });
    const unlistenReturning = listen("returning_user", () => {
      setShowReturning(true);
    });
    const unlistenBest = listen("best_session", () => {
      setShowBestSession(true);
    });
    const unlistenSleep = listen<SleepChangedPayload>("sleep_changed", (event) => {
      setSleeping(event.payload.sleeping);
      setPrivacyMode(event.payload.privacy);
    });
    const unlistenWake = listen("wake_animation", () => {
      setShowWake(true);
    });
    return () => {
      unlistenReady.then((f) => f());
      unlistenState.then((f) => f());
      unlistenReturning.then((f) => f());
      unlistenBest.then((f) => f());
      unlistenSleep.then((f) => f());
      unlistenWake.then((f) => f());
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "transparent" }}>
      {DEBUG_MONITORS && monitors.map((m, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            left: m.x,
            top: m.y,
            width: m.width,
            height: m.height,
            background: 'rgba(255,0,0,0.15)',
            border: '2px solid rgba(255,0,0,0.6)',
            pointerEvents: 'none',
            zIndex: 9998,
            boxSizing: 'border-box',
          }}
        />
      ))}
      {DEBUG_MONITORS && (
        <div style={{
          position: 'fixed', left: 8, top: 8, color: 'white', fontSize: 11,
          fontFamily: 'monospace', textShadow: '1px 1px 2px black',
          pointerEvents: 'none', zIndex: 9999,
        }}>
          wa: {workArea.width}×{workArea.height} | sprite: {spriteSize} | vw: {window.innerWidth} vh: {window.innerHeight}
          {monitors.map((m, i) => ` | m${i}: ${m.x},${m.y} ${m.width}×${m.height}`)}
        </div>
      )}
      <Creature
        x={pos.x}
        y={pos.y}
        displaySize={spriteSize}
        state={wispState}
        coldStart={coldStart}
        opacity={idleOpacity}
        showReturning={showReturning}
        showBestSession={showBestSession}
        burnDistress={burnDistress}
        sleeping={sleeping}
        privacyMode={privacyMode}
        showWake={showWake}
        onPositionChange={updatePosition}
        onReturningDone={() => setShowReturning(false)}
        onBestSessionDone={() => setShowBestSession(false)}
        onWakeDone={() => setShowWake(false)}
      />
    </div>
  );
}
