import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import Creature from "./components/Creature";
import { useCreaturePosition } from "./hooks/useCreaturePosition";

type WispState = "focus" | "calm" | "deep" | "spark" | "burn" | "fade" | "rest";

interface StateChangedPayload {
  state: WispState;
  cold_start: boolean;
}

export default function App() {
  const [bridgeReady, setBridgeReady] = useState(false);
  const [wispState, setWispState] = useState<WispState>("rest");
  const [coldStart, setColdStart] = useState(true);

  const onBoundsChange = useCallback(
    (x: number, y: number, w: number, h: number) => {
      invoke("set_creature_bounds", { x, y, width: w, height: h });
    },
    []
  );

  const { pos, updatePosition } = useCreaturePosition(onBoundsChange);

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
    return () => {
      unlistenReady.then((f) => f());
      unlistenState.then((f) => f());
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
          onPositionChange={updatePosition}
        />
      )}
    </div>
  );
}
