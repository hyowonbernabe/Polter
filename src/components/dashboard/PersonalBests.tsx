import type { DashboardData } from "../../pages/Dashboard";

function fmtMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function BestCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10,
      padding: "11px 13px",
    }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function PersonalBests({ data }: { data: DashboardData | null }) {
  const longestEver = data?.longest_focus_ever_minutes ?? 0;
  const bestWeek    = data?.best_day_this_week_minutes ?? 0;

  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Personal Bests
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <BestCard label="Longest focus ever"    value={longestEver > 0 ? fmtMinutes(longestEver) : "—"} />
        <BestCard label="Best day this week"    value={bestWeek    > 0 ? fmtMinutes(bestWeek)    : "—"} />
      </div>
    </div>
  );
}
