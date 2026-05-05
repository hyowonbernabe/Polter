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
  const [sound, setSound] = useState(false);

  useEffect(() => {
    loadPreferences().then((p) => {
      setSound(p.bubble_sound_enabled);
    });
  }, []);

  async function toggleSound() {
    const next = !sound;
    setSound(next);
    await savePref("bubble_sound_enabled", next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

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
