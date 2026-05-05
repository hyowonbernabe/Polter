import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import StateHeader from "../components/dashboard/StateHeader";
import TodayGlance from "../components/dashboard/TodayGlance";
import ActivityChart from "../components/dashboard/ActivityChart";
import StateDistribution from "../components/dashboard/StateDistribution";
import PersonalBests from "../components/dashboard/PersonalBests";
import InsightHistory from "../components/dashboard/InsightHistory";
import WhatWispKnows from "../components/dashboard/WhatWispKnows";
import DashboardDivider from "../components/dashboard/DashboardDivider";
import LiveMetrics from "../components/dashboard/LiveMetrics";
import LivePulse from "../components/dashboard/LivePulse";
import ActivityTimeline from "../components/dashboard/ActivityTimeline";
import PermissionStatus, { Tier2Permissions } from "../components/dashboard/PermissionStatus";

export interface DashboardDaySummary {
  date: string;
  focus_minutes: number;
  deep_minutes: number;
  spark_minutes: number;
  burn_minutes: number;
  calm_minutes: number;
  fade_minutes: number;
  total_active_minutes: number;
}

export interface DashboardInsight {
  id: number;
  timestamp: number;
  state: string;
  insight_text: string;
  extended_text: string;
  insight_type: string;
}

export interface TodayMetrics {
  avg_typing_speed: number;
  avg_error_rate: number;
  total_pauses: number;
  avg_mouse_speed: number;
  avg_mouse_jitter: number;
  total_clicks: number;
  total_scrolls: number;
  avg_cpu: number;
  avg_ram: number;
  total_app_switches: number;
  top_app: string | null;
}

export interface HourlyPoint {
  hour: number;
  avg_typing_speed: number;
  avg_cpu: number;
  snapshot_count: number;
}

export interface DashboardData {
  today_active_minutes: number;
  today_longest_focus_minutes: number;
  today_insight_count: number;
  today_session_count: number;
  days: DashboardDaySummary[];
  recent_insights: DashboardInsight[];
  longest_focus_ever_minutes: number;
  best_day_this_week_minutes: number;
  today_metrics: TodayMetrics;
  today_hourly: HourlyPoint[];
}

export interface CurrentStateInfo {
  state: string;
  state_entered_ms: number | null;
}

export default function Dashboard() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [stateInfo, setStateInfo] = useState<CurrentStateInfo>({ state: "rest", state_entered_ms: null });
  const [bufferStats, setBufferStats] = useState({ keys: 0, clicks: 0, scrolls: 0, moves: 0, last_event_ms: null as number | null });
  const [liveStatus, setLiveStatus] = useState({ session_id: null as number | null, snapshots_today: 0, last_snapshot_ms: null as number | null, input_monitor_alive: false, current_longest_focus_mins: 0, inference_active_secs: 0, inference_last_error: null as string | null, api_key_present: false });
  const [secondsUntilSnap, setSecondsUntilSnap] = useState(60);
  const [justUpdated, setJustUpdated] = useState(false);
  const [tier2Permissions, setTier2Permissions] = useState<Tier2Permissions>({ screen: false, clipboard: false, calendar: false });
  const containerRef = useRef<HTMLDivElement>(null);
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
      invoke("close_dashboard").catch(console.error);
    }, 240);
  }, [cancelClose]);

  // 500ms polling for live buffer stats and monitor status
  useEffect(() => {
    const id = setInterval(() => {
      invoke<typeof bufferStats>("get_buffer_stats").then(setBufferStats).catch(() => {});
      invoke<typeof liveStatus>("get_live_status").then(setLiveStatus).catch(() => {});
    }, 500);
    return () => clearInterval(id);
  }, []);

  // 1-second countdown tick toward next snapshot
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsUntilSnap(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Listen for snapshot-fired event from the backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen("activity_pulse", () => {
      invoke<DashboardData>("get_dashboard_data").then(setData).catch(console.error);
      invoke<CurrentStateInfo>("get_current_state_info").then(setStateInfo).catch(console.error);
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 600);
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  // Listen for state machine transitions from the backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<{ state: string; cold_start: boolean }>("state_changed", () => {
      invoke<CurrentStateInfo>("get_current_state_info").then(setStateInfo).catch(console.error);
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  // Refresh dashboard data immediately when an insight fires (keeps count + history live)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen("insight_ready", () => {
      invoke<DashboardData>("get_dashboard_data").then(setData).catch(console.error);
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  // Listen for permission changes from Settings
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<Tier2Permissions>("tier2_permissions_changed", (event) => {
      setTier2Permissions(event.payload);
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  // Ensure visibility when backend forces show
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen("window_show", () => {
      cancelClose();
      invoke<DashboardData>("get_dashboard_data").then(setData).catch(console.error);
      invoke<CurrentStateInfo>("get_current_state_info").then(setStateInfo).catch(console.error);
      invoke<Tier2Permissions>("get_tier2_permissions").then(setTier2Permissions).catch(console.error);
      requestAnimationFrame(() => setVisible(true));
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [cancelClose]);

  // Derive countdown from last_snapshot_ms whenever liveStatus changes
  useEffect(() => {
    if (liveStatus.last_snapshot_ms) {
      const elapsed = Math.floor((Date.now() - liveStatus.last_snapshot_ms) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setSecondsUntilSnap(remaining);
    }
  }, [liveStatus.last_snapshot_ms]);

  // Reload data and re-animate every time the window gains focus (i.e. is reopened)
  useEffect(() => {
    const win = getCurrentWebviewWindow();
    let unlisten: (() => void) | undefined;
    win.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        cancelClose();
        invoke<DashboardData>("get_dashboard_data").then(setData).catch(console.error);
        invoke<CurrentStateInfo>("get_current_state_info").then(setStateInfo).catch(console.error);
        invoke<Tier2Permissions>("get_tier2_permissions").then(setTier2Permissions).catch(console.error);
        requestAnimationFrame(() => setVisible(true));
      } else {
        handleClose();
      }
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [handleClose, cancelClose]);

  // Initial open — data fetch + animate in
  useEffect(() => {
    invoke<DashboardData>("get_dashboard_data").then(setData).catch(console.error);
    invoke<CurrentStateInfo>("get_current_state_info").then(setStateInfo).catch(console.error);
    invoke<Tier2Permissions>("get_tier2_permissions").then(setTier2Permissions).catch(console.error);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Merge live focus data into dashboard data so Today's longest focus reflects the running session
  const mergedData = data ? {
    ...data,
    today_longest_focus_minutes: Math.max(
      data.today_longest_focus_minutes,
      liveStatus.current_longest_focus_mins
    ),
    best_day_this_week_minutes: Math.max(
      data.best_day_this_week_minutes,
      liveStatus.current_longest_focus_mins
    ),
  } : null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        pointerEvents: "none",
      }}
    >
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
        .wisp-close:hover { background: rgba(255,255,255,0.12) !important; }
        @keyframes snap-flash {
          0%   { box-shadow: 0 0 0 0 rgba(100,200,180,0.0); }
          20%  { box-shadow: 0 0 0 6px rgba(100,200,180,0.25); }
          100% { box-shadow: 0 0 0 0 rgba(100,200,180,0.0); }
        }
        .snap-flash { animation: snap-flash 600ms ease-out; }
      `}</style>

      {/* Outer panel — clipping container so scrollbar respects border-radius */}
      <div
        style={{
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
        }}
      >
        {/* Header row — state + settings + close button */}
        <div style={{ display: "flex", alignItems: "center", padding: "18px 16px 16px 20px", flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <StateHeader stateInfo={stateInfo} />
          </div>
          <button
            className="wisp-close"
            onClick={() => invoke("open_settings").catch(console.error)}
            title="Settings"
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
              fontSize: 13,
              lineHeight: 1,
              flexShrink: 0,
              marginRight: 6,
              transition: "background 150ms ease",
              fontFamily: "inherit",
            }}
          >
            ⚙
          </button>
          <button
            className="wisp-close"
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

        {/* Scrollable body — minHeight:0 lets the flex child honour the parent maxHeight */}
        <div
          className="wisp-scroll"
          style={{ overflowY: "auto", overflowX: "hidden", flex: 1, minHeight: 0 }}
        >
          <div style={{ padding: "14px 20px" }}>
            <LivePulse
              bufferKeys={bufferStats.keys}
              bufferClicks={bufferStats.clicks}
              bufferScrolls={bufferStats.scrolls}
              snapshotsToday={liveStatus.snapshots_today}
              inputMonitorAlive={liveStatus.input_monitor_alive}
              secondsUntilSnap={secondsUntilSnap}
              justUpdated={justUpdated}
              inferenceActiveSecs={liveStatus.inference_active_secs}
              inferenceLastError={liveStatus.inference_last_error}
              apiKeyPresent={liveStatus.api_key_present}
            />
          </div>

          <DashboardDivider />

          <div style={{ padding: "14px 20px" }}>
            <TodayGlance data={mergedData} />
          </div>

          <DashboardDivider />

          <div style={{ padding: "14px 20px" }}>
            <LiveMetrics metrics={mergedData?.today_metrics ?? null} flash={justUpdated} />
          </div>

          <DashboardDivider />

          <div style={{ padding: "14px 20px" }}>
            <ActivityTimeline hourly={mergedData?.today_hourly ?? []} />
          </div>

          <DashboardDivider />

          <div style={{ padding: "14px 20px" }}>
            <ActivityChart days={mergedData?.days ?? []} />
          </div>

          <DashboardDivider />

          <div style={{ padding: "14px 20px" }}>
            <StateDistribution days={mergedData?.days ?? []} />
          </div>

          <DashboardDivider />

          <div style={{ padding: "14px 20px" }}>
            <PersonalBests data={mergedData} />
          </div>

          <DashboardDivider />

          <div style={{ padding: "14px 20px" }}>
            <InsightHistory insights={mergedData?.recent_insights ?? []} />
          </div>

          <DashboardDivider />

          <div style={{ padding: "14px 20px" }}>
            <WhatWispKnows data={mergedData} />
          </div>

          <DashboardDivider />

          <div style={{ padding: "14px 20px 18px" }}>
            <PermissionStatus permissions={tier2Permissions} />
          </div>
        </div>
      </div>
    </div>
  );
}
