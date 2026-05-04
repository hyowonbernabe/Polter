import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { HourlyPoint } from "../../pages/Dashboard";

interface Row { hour: number; typing: number; cpu: number; }

function buildRows(hourly: HourlyPoint[]): Row[] {
  const currentHour = new Date().getHours();
  const map = new Map(hourly.map((h) => [h.hour, h]));
  return Array.from({ length: currentHour + 1 }, (_, h) => ({
    hour: h,
    typing: map.get(h)?.avg_typing_speed ?? 0,
    cpu:    map.get(h)?.avg_cpu ?? 0,
  }));
}

function fmt12(hour: number): string {
  if (hour === 0)  return "12a";
  if (hour < 12)  return `${hour}a`;
  if (hour === 12) return "12p";
  return `${hour - 12}p`;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: number;
}) {
  if (!active || !payload?.length || label === undefined) return null;
  return (
    <div style={{
      background: "rgba(12,12,20,0.96)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8,
      padding: "7px 11px",
      fontSize: 11,
    }}>
      <div style={{ color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>{fmt12(label)}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
          <span style={{ color: "rgba(255,255,255,0.7)" }}>{p.name}</span>
          <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.45)", paddingLeft: 10 }}>
            {p.name === "typing" ? `${p.value.toFixed(1)} k/s` : `${p.value.toFixed(0)}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ActivityTimeline({ hourly }: { hourly: HourlyPoint[] }) {
  const rows = buildRows(hourly);
  const hasData = rows.some((r) => r.typing > 0 || r.cpu > 0);

  const tickHours = rows
    .filter((r) => r.hour % 6 === 0)
    .map((r) => r.hour);

  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Today's Timeline
      </div>
      {!hasData ? (
        <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: 12, fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>
          No activity recorded yet today.
        </p>
      ) : (
        <div style={{ width: "100%", overflow: "hidden" }}>
          <ResponsiveContainer width="99%" height={80}>
            <AreaChart data={rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tl-typing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6ba3d6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6ba3d6" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="tl-cpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f4a347" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f4a347" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="hour"
                ticks={tickHours}
                tickFormatter={fmt12}
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
              <Area dataKey="cpu"    name="cpu"    type="monotone" stroke="#f4a347" strokeWidth={1.2} fill="url(#tl-cpu)"    dot={false} />
              <Area dataKey="typing" name="typing" type="monotone" stroke="#6ba3d6" strokeWidth={1.5} fill="url(#tl-typing)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 14, marginTop: 6, paddingLeft: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 2, borderRadius: 1, background: "#6ba3d6" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>typing speed</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 2, borderRadius: 1, background: "#f4a347" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>cpu</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
