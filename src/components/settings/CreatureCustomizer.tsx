import { useEffect, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { loadPreferences, savePref, type Corner } from "../../lib/preferences";

const CORNERS: { key: Corner; label: string; symbol: string }[] = [
  { key: "tl", label: "Top-left",     symbol: "↖" },
  { key: "tr", label: "Top-right",    symbol: "↗" },
  { key: "bl", label: "Bottom-left",  symbol: "↙" },
  { key: "br", label: "Bottom-right", symbol: "↘" },
];

function PillButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? "rgba(107,163,214,0.22)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${active ? "rgba(107,163,214,0.50)" : "rgba(255,255,255,0.10)"}`,
        borderRadius: 8,
        padding: "6px 0",
        fontSize: 11,
        color: active ? "rgba(107,163,214,0.95)" : "rgba(255,255,255,0.55)",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
      }}
    >
      {children}
    </button>
  );
}

export default function CreatureCustomizer() {
  const [scale, setScale]     = useState<number>(1.0);
  const [corner, setCorner]   = useState<Corner>("br");
  const [opacity, setOpacity] = useState(0.35);

  useEffect(() => {
    loadPreferences().then((p) => {
      setScale(p.creature_scale);
      setCorner(p.default_corner);
      setOpacity(p.idle_opacity);
    });
  }, []);

  async function changeScale(v: number) {
    setScale(v);
    await savePref("creature_scale", v);
    await emit("creature_scale_changed", v);
  }

  async function changeCorner(c: Corner) {
    setCorner(c);
    await savePref("default_corner", c);
  }

  async function snapNow() {
    await emit("creature_snap_to_corner", { corner });
  }

  async function changeOpacity(v: number) {
    setOpacity(v);
    await savePref("idle_opacity", v);
    await emit("idle_opacity_changed", v);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Scale */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>Scale</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>
            {scale.toFixed(2)}×
          </div>
        </div>
        <input
          type="range"
          min={0.5}
          max={2.0}
          step={0.05}
          value={scale}
          onChange={(e) => changeScale(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#6ba3d6" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Tiny</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>Huge</div>
        </div>
      </div>

      {/* Default corner */}
      <div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 8 }}>Default corner</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {CORNERS.map((c) => (
            <PillButton key={c.key} active={corner === c.key} onClick={() => changeCorner(c.key)}>
              {c.symbol}
            </PillButton>
          ))}
        </div>
        <button
          onClick={snapNow}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 7,
            padding: "5px 14px",
            fontSize: 11,
            color: "rgba(255,255,255,0.60)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Snap to {CORNERS.find((c) => c.key === corner)?.label ?? corner} now
        </button>
      </div>

      {/* Idle opacity */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>Idle fade</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>
            {Math.round(opacity * 100)}%
          </div>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
          How faded Polter becomes when you stop typing or moving
        </div>
        <input
          type="range"
          min={0.10}
          max={1.0}
          step={0.05}
          value={opacity}
          onChange={(e) => changeOpacity(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#6ba3d6" }}
        />
      </div>
    </div>
  );
}
