interface LivePulseProps {
  bufferKeys: number;
  bufferLeftClicks: number;
  bufferRightClicks: number;
  bufferScrolls: number;
  bufferDeletions: number;
  bufferUndos: number;
  bufferRedos: number;
  bufferSaves: number;
  snapshotsToday: number;
  inputMonitorAlive: boolean;
  secondsUntilSnap: number;
  justUpdated: boolean;
  inferenceActiveSecs: number;
  inferenceLastError: string | null;
  apiKeyPresent: boolean;
}

interface CounterPillProps {
  label: string;
  value: number;
}

function CounterPill({ label, value }: CounterPillProps) {
  const active = value > 0;
  return (
    <div
      style={{
        flex: 1,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        padding: "9px 10px",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 700,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          color: active ? "rgba(100,200,180,0.9)" : "rgba(255,255,255,0.25)",
          transition: "color 150ms ease, transform 80ms ease",
          transform: active ? "scale(1.05)" : "scale(1)",
          display: "inline-block",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function LivePulse({
  bufferKeys,
  bufferLeftClicks,
  bufferRightClicks,
  bufferScrolls,
  bufferDeletions,
  bufferUndos,
  bufferRedos,
  bufferSaves,
  snapshotsToday,
  inputMonitorAlive,
  secondsUntilSnap,
  justUpdated,
  inferenceActiveSecs,
  inferenceLastError,
  apiKeyPresent,
}: LivePulseProps) {
  const barPct = Math.min((secondsUntilSnap / 60) * 100, 100);

  return (
    <div>
      {/* Section label */}
      <div
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 10,
        }}
      >
        Live Collection
      </div>

      {/* Countdown bar */}
      <div
        style={{
          height: 3,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 99,
          overflow: "hidden",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${barPct}%`,
            borderRadius: 99,
            background: justUpdated
              ? "rgba(255,255,255,0.85)"
              : "rgba(100,200,180,0.7)",
            transition: justUpdated
              ? "background 80ms ease"
              : "width 900ms linear, background 400ms ease",
          }}
        />
      </div>

      {/* Countdown labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {secondsUntilSnap}s
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
          next snapshot
        </span>
      </div>

      {/* Counter pills — primary */}
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <CounterPill label="Keys" value={bufferKeys} />
        <CounterPill label="L-Click" value={bufferLeftClicks} />
        <CounterPill label="R-Click" value={bufferRightClicks} />
        <CounterPill label="Scrolls" value={bufferScrolls} />
      </div>

      {/* Counter pills — editing signals */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <CounterPill label="Deletes" value={bufferDeletions} />
        <CounterPill label="Undos" value={bufferUndos} />
        <CounterPill label="Redos" value={bufferRedos} />
        <CounterPill label="Saves" value={bufferSaves} />
      </div>

      {/* System health row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: inputMonitorAlive
                ? "rgba(100,210,140,1)"
                : "rgba(200,160,80,1)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: inputMonitorAlive
                ? "rgba(100,210,140,0.85)"
                : "rgba(200,160,80,0.85)",
            }}
          >
            {inputMonitorAlive ? "collecting" : "waiting"}
          </span>
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontVariantNumeric: "tabular-nums" }}>
          {snapshotsToday} snapshot{snapshotsToday !== 1 ? "s" : ""} today
        </span>
      </div>

      {/* Insights row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        {!apiKeyPresent ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "rgba(200,160,80,1)",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: "rgba(200,160,80,0.85)" }}>
                no API key
              </span>
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
              add one in Settings
            </span>
          </>
        ) : inferenceActiveSecs < 300 ? (
          <>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              warming up
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontVariantNumeric: "tabular-nums" }}>
              {Math.ceil((300 - inferenceActiveSecs) / 60)}m until insights
            </span>
          </>
        ) : inferenceLastError !== null ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "rgba(200,160,80,1)",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: "rgba(200,160,80,0.85)" }}>
                insight error
              </span>
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
              {inferenceLastError.length > 35
                ? inferenceLastError.slice(0, 35) + "…"
                : inferenceLastError}
            </span>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "rgba(100,210,140,1)",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: "rgba(100,210,140,0.85)" }}>
              insights active
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
