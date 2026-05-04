import { useEffect, useState } from "react";
import type { CurrentStateInfo } from "../../pages/Dashboard";

const STATE_COLORS: Record<string, string> = {
  focus: "#6ba3d6",
  calm:  "#6ba3d6",
  deep:  "#6ba3d6",
  spark: "#f4a347",
  burn:  "#cc4400",
  fade:  "#8e7fa8",
  rest:  "#555568",
};

const STATE_LABELS: Record<string, string> = {
  focus: "Focusing",
  calm:  "Calm",
  deep:  "Deep Work",
  spark: "In the Zone",
  burn:  "Burning",
  fade:  "Fading",
  rest:  "Resting",
};

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function StateHeader({ stateInfo }: { stateInfo: CurrentStateInfo }) {
  const [now, setNow] = useState(Date.now());

  // Refresh every 30s so duration stays current
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const color = STATE_COLORS[stateInfo.state] ?? "#555568";
  const label = STATE_LABELS[stateInfo.state] ?? stateInfo.state;
  const durationMs = stateInfo.state_entered_ms != null
    ? now - stateInfo.state_entered_ms
    : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 8px ${color}`,
        flexShrink: 0,
      }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>{label}</div>
        {durationMs != null && durationMs > 0 && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
            for {formatDuration(durationMs)}
          </div>
        )}
      </div>
    </div>
  );
}
