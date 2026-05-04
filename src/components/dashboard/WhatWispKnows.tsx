import type { DashboardData } from "../../pages/Dashboard";

function fmtMinutes(mins: number): string {
  if (mins < 60) return `${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h !== 1 ? "s" : ""}`;
}

function buildSummary(data: DashboardData): string[] {
  const lines: string[] = [];
  const totalDays = data.days.length;
  if (totalDays === 0) {
    return ["Wisp is still learning your patterns. Come back after a few work sessions."];
  }

  const totalActive = data.days.reduce((s, d) => s + d.total_active_minutes, 0);
  lines.push(`Over the past ${totalDays} day${totalDays !== 1 ? "s" : ""}, Wisp has observed ${fmtMinutes(totalActive)} of active computer use.`);

  const focusTotal = data.days.reduce((s, d) => s + d.focus_minutes + d.deep_minutes, 0);
  if (focusTotal > 0) {
    lines.push(`About ${fmtMinutes(focusTotal)} was in focused or deep-work states.`);
  }

  if (data.longest_focus_ever_minutes > 0) {
    lines.push(`Your longest unbroken focus block on record is ${fmtMinutes(data.longest_focus_ever_minutes)}.`);
  }

  const insightCount = data.recent_insights.length;
  if (insightCount > 0) {
    lines.push(`Wisp has shared ${insightCount} insight${insightCount !== 1 ? "s" : ""} in the last 20 sessions.`);
  }

  lines.push("All data stays on your device and is never uploaded anywhere.");
  return lines;
}

export default function WhatWispKnows({ data }: { data: DashboardData | null }) {
  const lines = data ? buildSummary(data) : ["Loading…"];

  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        What Wisp Knows
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {lines.map((line, i) => (
          <p key={i} style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
