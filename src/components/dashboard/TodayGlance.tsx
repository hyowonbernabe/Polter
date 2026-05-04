import type { DashboardData } from "../../pages/Dashboard";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function fmtMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TodayGlance({ data }: { data: DashboardData | null }) {
  const active = data?.today_active_minutes ?? 0;
  const focus  = data?.today_longest_focus_minutes ?? 0;
  const count  = data?.today_insight_count ?? 0;

  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Today
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Stat label="active time" value={active > 0 ? fmtMinutes(active) : "—"} />
        <div style={{ width: 1, background: "rgba(255,255,255,0.07)", alignSelf: "stretch" }} />
        <Stat label="longest focus" value={focus > 0 ? fmtMinutes(focus) : "—"} />
        <div style={{ width: 1, background: "rgba(255,255,255,0.07)", alignSelf: "stretch" }} />
        <Stat label="insights" value={String(count)} />
      </div>
    </div>
  );
}
