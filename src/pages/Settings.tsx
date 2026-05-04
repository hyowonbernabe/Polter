import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import InferenceBadge from "../components/settings/InferenceBadge";
import ApiKeyField from "../components/settings/ApiKeyField";
import ActiveSensorsList from "../components/settings/ActiveSensorsList";
import TierTwoSection from "../components/settings/TierTwoSection";
import InsightControls from "../components/settings/InsightControls";
import CreatureCustomizer from "../components/settings/CreatureCustomizer";
import SleepScheduleEditor from "../components/settings/SleepScheduleEditor";
import DataControls from "../components/settings/DataControls";
import SettingsSection from "../components/settings/SettingsSection";

export default function Settings() {
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    cancelClose();
    setVisible(false);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      invoke("close_settings").catch(console.error);
    }, 240);
  }, [cancelClose]);

  useEffect(() => {
    const win = getCurrentWebviewWindow();
    let unlisten: (() => void) | undefined;
    win.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        cancelClose();
        requestAnimationFrame(() => setVisible(true));
      } else {
        handleClose();
      }
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [handleClose, cancelClose]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "flex-end",
      pointerEvents: "none",
    }}>
      <style>{`
        .wisp-scroll::-webkit-scrollbar { width: 4px; }
        .wisp-scroll::-webkit-scrollbar-track { background: transparent; }
        .wisp-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 99px;
        }
        .wisp-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.22);
        }
        .wisp-btn:hover { background: rgba(255,255,255,0.12) !important; }
        input[type="range"]::-webkit-slider-runnable-track { height: 3px; border-radius: 2px; background: rgba(255,255,255,0.12); }
        input[type="range"]::-webkit-slider-thumb { margin-top: -4px; }
      `}</style>

      <div style={{
        width: 420,
        maxHeight: 660,
        background: "rgba(12, 12, 20, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        color: "rgba(255,255,255,0.90)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 13,
        pointerEvents: "auto",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transform: visible ? "scale(1)" : "scale(0.94)",
        opacity: visible ? 1 : 0,
        transition: "transform 240ms cubic-bezier(0.16,1,0.3,1), opacity 220ms ease",
        transformOrigin: "bottom right",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "18px 16px 14px 20px", flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.90)", marginBottom: 5 }}>
              Settings
            </div>
            <InferenceBadge />
          </div>
          <button
            className="wisp-btn"
            onClick={handleClose}
            title="Close"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 8,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "rgba(255,255,255,0.45)",
              fontSize: 14,
              lineHeight: 1,
              flexShrink: 0,
              transition: "background 150ms ease",
              fontFamily: "inherit",
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="wisp-scroll"
          style={{ overflowY: "auto", overflowX: "hidden", flex: 1, minHeight: 0 }}
        >
          <SettingsSection title="AI & Inference">
            <ApiKeyField />
          </SettingsSection>

          <SettingsSection title="Active Sensors">
            <ActiveSensorsList />
          </SettingsSection>

          <SettingsSection title="Tier 2 Signals (Opt-in)">
            <TierTwoSection />
          </SettingsSection>

          <SettingsSection title="Insights">
            <InsightControls />
          </SettingsSection>

          <SettingsSection title="Creature">
            <CreatureCustomizer />
          </SettingsSection>

          <SettingsSection title="Auto-Sleep">
            <SleepScheduleEditor />
          </SettingsSection>

          <SettingsSection title="Data">
            <DataControls />
          </SettingsSection>

          <SettingsSection title="Privacy Hotkey">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.5 }}>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>Instant privacy shortcut</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                  A configurable global key to pause Wisp instantly
                </div>
              </div>
              <div style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 6,
                padding: "4px 10px",
                whiteSpace: "nowrap",
              }}>
                Coming soon
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Permissions">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>Review Tier 2 permissions</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                  Revisit your screen, clipboard, and calendar choices
                </div>
              </div>
              <button
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 7,
                  padding: "5px 12px",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.50)",
                  cursor: "not-allowed",
                  fontFamily: "inherit",
                  opacity: 0.6,
                }}
                disabled
                title="Permission review flow arrives in the onboarding update"
              >
                Review
              </button>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 10, fontStyle: "italic" }}>
              Full permission management arrives with the onboarding update.
            </div>
          </SettingsSection>

          <div style={{ height: 8 }} />
        </div>
      </div>
    </div>
  );
}
