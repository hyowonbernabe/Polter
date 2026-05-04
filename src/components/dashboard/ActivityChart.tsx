import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { DashboardDaySummary } from "../../pages/Dashboard";

interface ChartRow {
  day: string;
  focus: number;
  deep: number;
  spark: number;
  burn: number;
}

function toChartRows(days: DashboardDaySummary[]): ChartRow[] {
  // days come in DESC order; reverse for left-to-right chronology
  return [...days].reverse().map((d) => ({
    day: d.date.slice(5), // "MM-DD"
    focus: d.focus_minutes,
    deep:  d.deep_minutes,
    spark: d.spark_minutes,
    burn:  d.burn_minutes,
  }));
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + p.value, 0);
  return (
    <div style={{
      background: "rgba(12,12,20,0.96)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 12,
    }}>
      <div style={{ marginBottom: 4, color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{label}</div>
      {payload.map((p) => p.value > 0 && (
        <div key={p.name} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.fill }} />
          <span style={{ color: "rgba(255,255,255,0.8)" }}>{p.name}</span>
          <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.5)" }}>{p.value}m</span>
        </div>
      ))}
      <div style={{ marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 4, color: "rgba(255,255,255,0.5)" }}>
        total {total}m
      </div>
    </div>
  );
}

export default function ActivityChart({ days }: { days: DashboardDaySummary[] }) {
  const rows = toChartRows(days);
  const hasData = rows.some((r) => r.focus + r.deep + r.spark + r.burn > 0);

  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        7-Day Activity
      </div>
      {!hasData ? (
        <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: 12, fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>
          No data yet — check back after a few sessions.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={rows} barSize={22} barGap={2}>
            <XAxis
              dataKey="day"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="focus" name="focus" stackId="a" fill="#6ba3d6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="deep"  name="deep"  stackId="a" fill="#4a7ab5" radius={[0, 0, 0, 0]} />
            <Bar dataKey="spark" name="spark" stackId="a" fill="#f4a347" radius={[0, 0, 0, 0]} />
            <Bar dataKey="burn"  name="burn"  stackId="a" fill="#cc4400" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
