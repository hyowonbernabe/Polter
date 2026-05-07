import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Schedule {
  enabled: boolean;
  schedule_start_hour: number;
  schedule_start_minute: number;
  schedule_end_hour: number;
  schedule_end_minute: number;
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function toTimeStr(h: number, m: number) { return `${pad(h)}:${pad(m)}`; }
function fromTimeStr(s: string): [number, number] {
  const [h, m] = s.split(":").map(Number);
  return [h ?? 0, m ?? 0];
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 7,
  padding: "5px 9px",
  fontSize: 12,
  color: "rgba(255,255,255,0.80)",
  fontFamily: "inherit",
  outline: "none",
  cursor: "pointer",
};

export default function SleepScheduleEditor() {
  const [enabled, setEnabled]   = useState(false);
  const [startH, setStartH]     = useState(22);
  const [startM, setStartM]     = useState(0);
  const [endH, setEndH]         = useState(7);
  const [endM, setEndM]         = useState(0);

  useEffect(() => {
    invoke<Schedule>("get_sleep_status").then((s) => {
      setEnabled(s.enabled);
      setStartH(s.schedule_start_hour);
      setStartM(s.schedule_start_minute);
      setEndH(s.schedule_end_hour);
      setEndM(s.schedule_end_minute);
    });
  }, []);

  function commit(overrides: Partial<{ enabled: boolean; sh: number; sm: number; eh: number; em: number }> = {}) {
    const e  = overrides.enabled  ?? enabled;
    const sh = overrides.sh ?? startH;
    const sm = overrides.sm ?? startM;
    const eh = overrides.eh ?? endH;
    const em = overrides.em ?? endM;
    invoke("set_sleep_schedule", {
      schedule: {
        enabled: e,
        start_hour: sh,
        start_minute: sm,
        end_hour: eh,
        end_minute: em,
      },
    }).catch(console.error);
  }

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    commit({ enabled: next });
  }

  function onStartChange(val: string) {
    const [h, m] = fromTimeStr(val);
    setStartH(h); setStartM(m);
    commit({ sh: h, sm: m });
  }

  function onEndChange(val: string) {
    const [h, m] = fromTimeStr(val);
    setEndH(h); setEndM(m);
    commit({ eh: h, em: m });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>Auto-sleep schedule</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            Polter pauses automatically during quiet hours
          </div>
        </div>
        <Toggle on={enabled} onClick={toggleEnabled} />
      </div>

      {enabled && (
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 5 }}>Sleep at</div>
            <input
              type="time"
              value={toTimeStr(startH, startM)}
              onChange={(e) => onStartChange(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>→</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 5 }}>Wake at</div>
            <input
              type="time"
              value={toTimeStr(endH, endM)}
              onChange={(e) => onEndChange(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      role="switch"
      aria-checked={on}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: on ? "#6ba3d6" : "rgba(255,255,255,0.10)",
        border: `1px solid ${on ? "#6ba3d6" : "rgba(255,255,255,0.14)"}`,
        cursor: "pointer",
        position: "relative",
        transition: "background 200ms ease, border-color 200ms ease",
        flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute",
        top: 2,
        left: on ? 17 : 2,
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.90)",
        transition: "left 200ms ease",
      }} />
    </div>
  );
}
