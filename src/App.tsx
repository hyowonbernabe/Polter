import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import Creature from "./components/Creature";
import { useCreaturePosition } from "./hooks/useCreaturePosition";
import { useIdleDetection } from "./hooks/useIdleDetection";
import { type WispState } from "./lib/spriteConfig";

const BURN_DISTRESS_MS = 90 * 60 * 1_000;

interface StateChangedPayload {
  state: WispState;
  cold_start: boolean;
}

export default function App() {
  const [bridgeReady, setBridgeReady] = useState(false);
  const [wispState, setWispState] = useState<WispState>("rest");
  const [coldStart, setColdStart] = useState(true);
  const [showReturning, setShowReturning] = useState(false);
  const [showBestSession, setShowBestSession] = useState(false);
  const [burnDistress, setBurnDistress] = useState(false);

  const burnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onBoundsChange = useCallback(
    (x: number, y: number, w: number, h: number) => {
      invoke("set_creature_bounds", { x, y, width: w, height: h });
    },
    []
  );

  const { pos, updatePosition } = useCreaturePosition(onBoundsChange);
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
      setBridgeReady(true);
      console.log("[wisp] bridge confirmed, version:", event.payload.version);
    });
    const unlistenState = listen<StateChangedPayload>("state_changed", (event) => {
      setWispState(event.payload.state);
      setColdStart(event.payload.cold_start);
      console.log("[wisp] state:", event.payload.state, "cold_start:", event.payload.cold_start);
    });
    const unlistenReturning = listen("returning_user", () => {
      setShowReturning(true);
    });
    const unlistenBest = listen("best_session", () => {
      setShowBestSession(true);
    });
    return () => {
      unlistenReady.then((f) => f());
      unlistenState.then((f) => f());
      unlistenReturning.then((f) => f());
      unlistenBest.then((f) => f());
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "transparent" }}>
      {bridgeReady && (
        <Creature
          x={pos.x}
          y={pos.y}
          state={wispState}
          coldStart={coldStart}
          opacity={idleOpacity}
          showReturning={showReturning}
          showBestSession={showBestSession}
          burnDistress={burnDistress}
          onPositionChange={updatePosition}
          onReturningDone={() => setShowReturning(false)}
          onBestSessionDone={() => setShowBestSession(false)}
        />
      )}
    </div>
  );
}
