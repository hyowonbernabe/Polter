import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import Creature from "./components/Creature";
import { useCreaturePosition } from "./hooks/useCreaturePosition";

export default function App() {
  const [bridgeReady, setBridgeReady] = useState(false);

  const onBoundsChange = useCallback(
    (x: number, y: number, w: number, h: number) => {
      invoke("set_creature_bounds", { x, y, width: w, height: h });
    },
    []
  );

  const { pos, updatePosition } = useCreaturePosition(onBoundsChange);

  useEffect(() => {
    const unlisten = listen<{ version: string }>("wisp_ready", (event) => {
      setBridgeReady(true);
      console.log("[wisp] bridge confirmed, version:", event.payload.version);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "transparent" }}>
      {bridgeReady && (
        <Creature x={pos.x} y={pos.y} onPositionChange={updatePosition} />
      )}
    </div>
  );
}
