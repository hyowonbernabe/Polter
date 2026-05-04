import { useState } from "react";
import type { DashboardInsight } from "../../pages/Dashboard";
import EmptyBlock from "./EmptyBlock";

const STATE_COLORS: Record<string, string> = {
  focus: "#6ba3d6", calm: "#6ba3d6", deep: "#6ba3d6",
  spark: "#f4a347", burn: "#cc4400", fade: "#8e7fa8", rest: "#555568",
};

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function InsightItem({ insight }: { insight: DashboardInsight }) {
  const [expanded, setExpanded] = useState(false);
  const color = STATE_COLORS[insight.state] ?? "#555568";

  return (
    <div style={{
      borderLeft: `2px solid ${color}`,
      paddingLeft: 10,
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.80)", lineHeight: 1.5 }}>
        {insight.insight_text}
      </div>
      {expanded && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.50)", marginTop: 4, lineHeight: 1.5 }}>
          {insight.extended_text}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)" }}>
          {timeAgo(insight.timestamp)}
        </span>
        {!expanded && insight.extended_text && (
          <button
            onClick={() => setExpanded(true)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "rgba(255,255,255,0.35)",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
              textDecoration: "underline",
            }}
          >
            more
          </button>
        )}
      </div>
    </div>
  );
}

export default function InsightHistory({ insights }: { insights: DashboardInsight[] }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Recent Insights
      </div>
      {insights.length === 0 ? (
        <EmptyBlock message="No insights yet. Wisp will share observations as it learns your patterns." />
      ) : (
        insights.map((ins) => <InsightItem key={ins.id} insight={ins} />)
      )}
    </div>
  );
}
