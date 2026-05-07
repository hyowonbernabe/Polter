import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.60)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        background: "rgba(18,18,28,0.97)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: "20px 22px",
        maxWidth: 320,
        fontSize: 12,
        color: "rgba(255,255,255,0.75)",
        lineHeight: 1.5,
      }}>
        <p style={{ margin: "0 0 16px" }}>{message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 7, padding: "5px 14px", fontSize: 11, color: "rgba(255,255,255,0.55)", cursor: "pointer", fontFamily: "inherit" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ background: "rgba(204,68,0,0.25)", border: "1px solid rgba(204,68,0,0.50)", borderRadius: 7, padding: "5px 14px", fontSize: 11, color: "rgba(255,160,80,0.90)", cursor: "pointer", fontFamily: "inherit" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 7,
  padding: "7px 14px",
  fontSize: 11,
  color: "rgba(255,255,255,0.65)",
  cursor: "pointer",
  fontFamily: "inherit",
};

export default function DataControls() {
  const [confirmClear, setConfirmClear]   = useState(false);
  const [clearResult, setClearResult]     = useState<string | null>(null);
  const [exporting, setExporting]         = useState(false);

  async function handleClear() {
    try {
      const count = await invoke<number>("clear_snapshots");
      setClearResult(`Cleared ${count.toLocaleString()} snapshots.`);
      setTimeout(() => setClearResult(null), 4000);
    } catch {
      setClearResult("Failed to clear snapshots.");
      setTimeout(() => setClearResult(null), 4000);
    }
    setConfirmClear(false);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const text = await invoke<string>("export_insights");
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "polter-insights.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
    setExporting(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Retention info */}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", lineHeight: 1.6 }}>
        <div style={{ color: "rgba(255,255,255,0.60)", fontSize: 12, marginBottom: 6 }}>Retention windows</div>
        <div>Raw behavioral snapshots — 90 days</div>
        <div>Daily summaries — kept forever</div>
        <div>Insights — kept forever</div>
        <div style={{ marginTop: 6 }}>Nothing is ever sent to a server.</div>
      </div>

      {/* Export */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>Export insights</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            Download all past observations as a plain text file
          </div>
        </div>
        <button style={btnStyle} onClick={handleExport} disabled={exporting}>
          {exporting ? "Exporting…" : "Export"}
        </button>
      </div>

      {/* Clear */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>Clear raw data</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            Deletes behavioral snapshots. Summaries and insights are kept.
          </div>
        </div>
        <button
          style={{ ...btnStyle, color: "rgba(255,140,80,0.80)", borderColor: "rgba(204,68,0,0.30)" }}
          onClick={() => setConfirmClear(true)}
        >
          Clear
        </button>
      </div>

      {clearResult && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{clearResult}</div>
      )}

      {confirmClear && (
        <ConfirmDialog
          message="This will delete all raw behavioral snapshots. Your daily summaries and insights are not affected and will not be removed."
          confirmLabel="Delete snapshots"
          onConfirm={handleClear}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}
