import { useEffect, useState } from "react";
import { loadPreferences, savePref } from "../../lib/preferences";

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

export default function InsightControls() {
  const [cap, setCap]     = useState(3);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    loadPreferences().then((p) => {
      setCap(p.insight_cap_per_day);
      setSound(p.bubble_sound_enabled);
    });
  }, []);

  async function changeCap(v: number) {
    setCap(v);
    await savePref("insight_cap_per_day", v);
  }

  async function toggleSound() {
    const next = !sound;
    setSound(next);
    await savePref("bubble_sound_enabled", next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Daily cap */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>Max insights per day</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
              How many bubbles Wisp can surface in a single day
            </div>
          </div>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: "rgba(255,255,255,0.80)",
            minWidth: 20,
            textAlign: "right",
            alignSelf: "center",
          }}>
            {cap}
          </div>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={cap}
          onChange={(e) => changeCap(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#6ba3d6" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
        </div>
      </div>

      {/* Sound toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>Bubble sound</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            A soft chime when a new insight appears
          </div>
        </div>
        <Toggle on={sound} onClick={toggleSound} />
      </div>
    </div>
  );
}
