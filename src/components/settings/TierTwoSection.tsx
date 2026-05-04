const ITEMS = [
  {
    label: "Screen content",
    desc: "Wisp takes an occasional blurry snapshot to understand what kind of work you're doing — writing, watching, browsing — and processes it locally. No image is ever stored.",
  },
  {
    label: "Clipboard activity",
    desc: "Tracks how often you copy and paste — not what — to understand research and synthesis patterns.",
  },
  {
    label: "Calendar context",
    desc: "Reads the rough shape of your schedule — upcoming meetings, busy vs. free time — to explain why your stress level spikes before calls.",
  },
];

export default function TierTwoSection() {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ITEMS.map((item) => (
          <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, opacity: 0.5, pointerEvents: "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>{item.desc}</div>
            </div>
            {/* Disabled toggle */}
            <div style={{
              width: 34,
              height: 20,
              borderRadius: 10,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.14)",
              flexShrink: 0,
              marginTop: 2,
            }} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 12, fontStyle: "italic" }}>
        These signals arrive in a future update.
      </div>
    </div>
  );
}
