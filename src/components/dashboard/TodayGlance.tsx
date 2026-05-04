import type { DashboardData } from "../../pages/Dashboard";

function fmtMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function StatCard({
  label, value, accent,
}: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10,
      borderTop: `2px solid ${accent}`,
      padding: "10px 12px",
    }}>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 5 }}>
        {label}
      </div>
    </div>
  );
}

export default function TodayGlance({ data }: { data: DashboardData | null }) {
  const active   = data?.today_active_minutes ?? 0;
  const focus    = data?.today_longest_focus_minutes ?? 0;
  const insights = data?.today_insight_count ?? 0;
  const sessions = data?.today_session_count ?? 0;

  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Today
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <StatCard label="active time"    value={active   > 0 ? fmtMinutes(active) : "—"} accent="#6ba3d6" />
        <StatCard label="longest focus"  value={focus    > 0 ? fmtMinutes(focus)  : "—"} accent="#8b6bd6" />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <StatCard label="insights today" value={String(insights)} accent="#f4a347" />
        <StatCard label="sessions"       value={String(sessions)} accent="#7ec8c8" />
      </div>
    </div>
  );
}
