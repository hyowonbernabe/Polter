import type { DashboardDaySummary } from "../../pages/Dashboard";
import EmptyBlock from "./EmptyBlock";

const STATE_SEGMENTS = [
  { key: "focus_minutes", color: "#6ba3d6", label: "focus"  },
  { key: "deep_minutes",  color: "#4a7ab5", label: "deep"   },
  { key: "spark_minutes", color: "#f4a347", label: "spark"  },
  { key: "burn_minutes",  color: "#cc4400", label: "burn"   },
  { key: "calm_minutes",  color: "#7ec8c8", label: "calm"   },
  { key: "fade_minutes",  color: "#8e7fa8", label: "fade"   },
];

type SummaryKey = keyof DashboardDaySummary;

export default function StateDistribution({ days }: { days: DashboardDaySummary[] }) {
  const totals: Record<string, number> = {};
  let grand = 0;
  for (const seg of STATE_SEGMENTS) {
    const t = days.reduce((s, d) => s + ((d[seg.key as SummaryKey] as number) ?? 0), 0);
    totals[seg.key] = t;
    grand += t;
  }

  const hasData = grand > 0;

  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Weekly Distribution
      </div>
      {!hasData ? (
        <EmptyBlock message="No activity data yet." />
      ) : (
        <>
          <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 }}>
            {STATE_SEGMENTS.map((seg) => {
              const pct = totals[seg.key] / grand;
              if (pct < 0.01) return null;
              return (
                <div
                  key={seg.key}
                  style={{ flex: pct, background: seg.color, minWidth: 4 }}
                  title={`${seg.label}: ${Math.round(pct * 100)}%`}
                />
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10 }}>
            {STATE_SEGMENTS.map((seg) => {
              const pct = totals[seg.key] / grand;
              if (pct < 0.01) return null;
              return (
                <div key={seg.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                    {seg.label} {Math.round(pct * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
