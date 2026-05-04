import type { DashboardData } from "../../pages/Dashboard";

function fmtMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function PersonalBests({ data }: { data: DashboardData | null }) {
  const longestEver = data?.longest_focus_ever_minutes ?? 0;
  const bestWeek    = data?.best_day_this_week_minutes ?? 0;

  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Personal Bests
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Longest focus block</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {longestEver > 0 ? fmtMinutes(longestEver) : "—"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Best active day this week</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {bestWeek > 0 ? fmtMinutes(bestWeek) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
