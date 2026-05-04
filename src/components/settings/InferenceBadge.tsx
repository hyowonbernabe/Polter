import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

type Mode = "cloud" | "local" | "unavailable";

const BADGE: Record<Mode, { label: string; color: string; dot: string }> = {
  cloud:       { label: "Cloud AI",  color: "rgba(107,163,214,0.18)", dot: "#6ba3d6" },
  local:       { label: "Local AI",  color: "rgba(126,200,200,0.18)", dot: "#7ec8c8" },
  unavailable: { label: "Offline",   color: "rgba(255,255,255,0.06)", dot: "rgba(255,255,255,0.25)" },
};

export default function InferenceBadge() {
  const [mode, setMode] = useState<Mode>("unavailable");

  useEffect(() => {
    invoke<boolean>("has_api_key").then((has) => {
      setMode(has ? "cloud" : "unavailable");
    });
    const unlisten = listen<string>("inference_mode_changed", (e) => {
      const m = e.payload as Mode;
      if (m === "cloud" || m === "local" || m === "unavailable") setMode(m);
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  const b = BADGE[mode];
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: b.color,
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 20,
      padding: "3px 10px 3px 8px",
      fontSize: 11,
      color: "rgba(255,255,255,0.70)",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: b.dot, flexShrink: 0 }} />
      {b.label}
    </div>
  );
}
