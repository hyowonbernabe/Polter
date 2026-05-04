import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function ApiKeyField() {
  const [hasKey, setHasKey] = useState(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invoke<boolean>("has_api_key").then(setHasKey);
  }, []);

  async function handleSave() {
    if (!input.trim()) return;
    setStatus("saving");
    try {
      await invoke("set_api_key", { key: input.trim() });
      setHasKey(true);
      setInput("");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  async function handleClear() {
    try {
      await invoke("clear_api_key");
      setHasKey(false);
      setInput("");
      setStatus("idle");
    } catch {
      // ignore
    }
  }

  const btnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 7,
    padding: "5px 12px",
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    fontFamily: "inherit",
    flexShrink: 0,
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 4 }}>
        OpenRouter API key
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>
        Required for AI-generated insights. Your key is stored securely in Windows Credential Manager and never leaves your device.
      </div>

      {hasKey ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            flex: 1,
            background: "rgba(126,200,200,0.10)",
            border: "1px solid rgba(126,200,200,0.25)",
            borderRadius: 7,
            padding: "6px 10px",
            fontSize: 11,
            color: "rgba(126,200,200,0.85)",
          }}>
            ● Key saved
          </div>
          <button style={btnStyle} onClick={handleClear}>Remove</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            type="password"
            placeholder="sk-or-…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 7,
              padding: "6px 10px",
              fontSize: 11,
              color: "rgba(255,255,255,0.85)",
              fontFamily: "monospace",
              outline: "none",
            }}
          />
          <button
            style={{ ...btnStyle, opacity: input.trim() ? 1 : 0.45 }}
            onClick={handleSave}
            disabled={!input.trim() || status === "saving"}
          >
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save"}
          </button>
        </div>
      )}
      {status === "error" && (
        <div style={{ fontSize: 11, color: "#cc4400", marginTop: 6 }}>
          Failed to save key. Please try again.
        </div>
      )}
    </div>
  );
}
