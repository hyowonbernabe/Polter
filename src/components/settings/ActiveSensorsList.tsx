import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface SleepStatus {
  sleeping: boolean;
  privacy: boolean;
}

interface Sensor {
  label: string;
  description: string;
  active: boolean;
}

function dot(active: boolean) {
  return (
    <div style={{
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: active ? "#7ec8c8" : "rgba(255,255,255,0.20)",
      flexShrink: 0,
      marginTop: 1,
    }} />
  );
}

export default function ActiveSensorsList() {
  const [status, setStatus] = useState<SleepStatus>({ sleeping: false, privacy: false });

  useEffect(() => {
    function refresh() {
      invoke<SleepStatus>("get_sleep_status").then(setStatus).catch(() => {});
    }
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const running = !status.sleeping && !status.privacy;

  const sensors: Sensor[] = [
    { label: "Keyboard timing",     description: "Key rhythm and pause patterns — never the keys themselves", active: running },
    { label: "Mouse behavior",      description: "Speed, steadiness, clicks, and scroll patterns",            active: running },
    { label: "System metrics",      description: "CPU and RAM usage",                                         active: running },
    { label: "App focus",           description: "Which app is active and for how long",                      active: running },
    { label: "Window count",        description: "How many windows are open — not their contents",            active: running },
    { label: "Power source",        description: "Plugged in or on battery",                                  active: running },
  ];

  const modeLabel = status.sleeping
    ? "Sleep mode active — all sensors paused"
    : status.privacy
    ? "Privacy mode active — all sensors paused"
    : "All sensors running";

  const modeColor = running ? "rgba(126,200,200,0.75)" : "rgba(255,255,255,0.30)";

  return (
    <div>
      <div style={{ fontSize: 11, color: modeColor, marginBottom: 12 }}>{modeLabel}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sensors.map((s) => (
          <div key={s.label} style={{ display: "flex", gap: 8 }}>
            {dot(s.active)}
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 1 }}>{s.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
