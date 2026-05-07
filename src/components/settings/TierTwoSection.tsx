import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Key = "screen" | "clipboard" | "calendar";

interface Tier2Permissions {
  screen: boolean;
  clipboard: boolean;
  calendar: boolean;
}

interface Item {
  key: Key;
  label: string;
  desc: string;
}

const ITEMS: Item[] = [
  {
    key: "screen",
    label: "Screen content",
    desc: "Occasional low-resolution screen snapshots are used to classify work type. Images are processed locally and not stored.",
  },
  {
    key: "clipboard",
    label: "Clipboard activity",
    desc: "Tracks how often copy and paste happen, not what was copied or pasted.",
  },
  {
    key: "calendar",
    label: "Calendar context",
    desc: "Reads meeting timing patterns so Polter can better understand context changes.",
  },
];

function Toggle({ on, disabled, onClick }: { on: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={on ? "On" : "Off"}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: `1px solid ${on ? "rgba(107,163,214,0.45)" : "rgba(255,255,255,0.14)"}`,
        background: on ? "rgba(107,163,214,0.20)" : "rgba(255,255,255,0.10)",
        position: "relative",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.92)",
          transition: "left 150ms ease",
        }}
      />
    </button>
  );
}

export default function TierTwoSection() {
  const [permissions, setPermissions] = useState<Tier2Permissions>({
    screen: false,
    clipboard: false,
    calendar: false,
  });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<Key | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    invoke<Tier2Permissions>("get_tier2_permissions")
      .then((p) => setPermissions(p))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(key: Key) {
    const next = { ...permissions, [key]: !permissions[key] };
    setPermissions(next);
    setSavingKey(key);
    setStatus("");
    try {
      const saved = await invoke<Tier2Permissions>("set_tier2_permissions", { permissions: next });
      setPermissions(saved);
      setStatus("Saved.");
    } catch {
      setPermissions(permissions);
      setStatus("Save failed. Please try again.");
    } finally {
      setSavingKey(null);
    }
  }

  const statusText = useMemo(() => {
    if (loading) return "Loading permissions...";
    if (savingKey !== null) return "Saving...";
    return status || "You can change these anytime.";
  }, [loading, savingKey, status]);

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ITEMS.map((item) => (
          <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>{item.desc}</div>
            </div>
            <Toggle
              on={permissions[item.key]}
              disabled={loading || savingKey !== null}
              onClick={() => toggle(item.key)}
            />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 12 }}>
        {statusText}
      </div>
    </div>
  );
}
