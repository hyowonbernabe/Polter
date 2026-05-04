import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import StateHeader from "../components/dashboard/StateHeader";
import TodayGlance from "../components/dashboard/TodayGlance";
import ActivityChart from "../components/dashboard/ActivityChart";
import StateDistribution from "../components/dashboard/StateDistribution";
import PersonalBests from "../components/dashboard/PersonalBests";
import InsightHistory from "../components/dashboard/InsightHistory";
import WhatWispKnows from "../components/dashboard/WhatWispKnows";
import DashboardDivider from "../components/dashboard/DashboardDivider";

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

export interface DashboardData {
  today_active_minutes: number;
  today_longest_focus_minutes: number;
  today_insight_count: number;
  days: DashboardDaySummary[];
  recent_insights: DashboardInsight[];
  longest_focus_ever_minutes: number;
  best_day_this_week_minutes: number;
}

export interface CurrentStateInfo {
  state: string;
  state_entered_ms: number | null;
}

export default function Dashboard() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [stateInfo, setStateInfo] = useState<CurrentStateInfo>({ state: "rest", state_entered_ms: null });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    invoke<DashboardData>("get_dashboard_data").then(setData).catch(console.error);
    invoke<CurrentStateInfo>("get_current_state_info").then(setStateInfo).catch(console.error);
  }, []);

  // Close when the window loses focus
  useEffect(() => {
    const win = getCurrentWebviewWindow();
    let unlisten: (() => void) | undefined;
    win.onFocusChanged(({ payload: focused }) => {
      if (!focused) {
        setVisible(false);
        setTimeout(() => invoke("close_dashboard").catch(console.error), 240);
      }
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

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
          overflowY: "auto",
          overflowX: "hidden",
          transform: visible ? "scale(1)" : "scale(0.94)",
          opacity: visible ? 1 : 0,
          transition: "transform 240ms cubic-bezier(0.16,1,0.3,1), opacity 220ms ease",
          transformOrigin: "bottom right",
        }}
      >
        <div style={{ padding: "18px 20px 16px" }}>
          <StateHeader stateInfo={stateInfo} />
        </div>

        <DashboardDivider />

        <div style={{ padding: "14px 20px" }}>
          <TodayGlance data={data} />
        </div>

        <DashboardDivider />

        <div style={{ padding: "14px 20px" }}>
          <ActivityChart days={data?.days ?? []} />
        </div>

        <DashboardDivider />

        <div style={{ padding: "14px 20px" }}>
          <StateDistribution days={data?.days ?? []} />
        </div>

        <DashboardDivider />

        <div style={{ padding: "14px 20px" }}>
          <PersonalBests data={data} />
        </div>

        <DashboardDivider />

        <div style={{ padding: "14px 20px" }}>
          <InsightHistory insights={data?.recent_insights ?? []} />
        </div>

        <DashboardDivider />

        <div style={{ padding: "14px 20px 18px" }}>
          <WhatWispKnows data={data} />
        </div>
      </div>
    </div>
  );
}
