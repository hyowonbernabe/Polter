import type { TodayMetrics } from "../../pages/Dashboard";

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginTop: 4, marginBottom: 8 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <span style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
        {value}
        {sub && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginLeft: 3 }}>{sub}</span>}
      </span>
    </div>
  );
}

function MetricCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10,
      padding: "11px 13px",
    }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 9 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function pct(n: number) { return `${n.toFixed(1)}%`; }
function num(n: number) { return n.toLocaleString(); }

function stripExe(app: string | null): string {
  if (!app) return "—";
  return app.replace(/\.exe$/i, "");
}

function jitterLabel(jitter: number): string {
  if (jitter === 0) return "—";
  if (jitter < 80)  return "steady";
  if (jitter < 200) return "normal";
  return "erratic";
}

export default function LiveMetrics({ metrics }: { metrics: TodayMetrics | null }) {
  const m = metrics;
  const noData = !m || (m.avg_typing_speed === 0 && m.total_clicks === 0 && m.total_scrolls === 0);

  return (
    <div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Today's Metrics
      </div>

      {noData ? (
        <p style={{ margin: 0, color: "rgba(255,255,255,0.30)", fontSize: 12, fontStyle: "italic" }}>
          No activity recorded yet today.
        </p>
      ) : (
        <>
          {/* Keyboard + Mouse side by side */}
          <div style={{ display: "flex", gap: 8 }}>
            <MetricCard title="Keyboard">
              <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.01em" }}>
                {m!.avg_typing_speed > 0 ? m!.avg_typing_speed.toFixed(1) : "—"}
                {m!.avg_typing_speed > 0 && (
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: 3, fontWeight: 400 }}>k/s</span>
                )}
              </div>
              <Bar value={m!.avg_typing_speed} max={5} color="#6ba3d6" />
              <Row
                label="Errors"
                value={m!.avg_error_rate > 0 ? pct(m!.avg_error_rate * 100) : "—"}
              />
              <Row label="Pauses" value={num(m!.total_pauses)} sub=">2s" />
            </MetricCard>

            <MetricCard title="Mouse">
              <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.01em" }}>
                {m!.avg_mouse_speed > 0 ? Math.round(m!.avg_mouse_speed) : "—"}
                {m!.avg_mouse_speed > 0 && (
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: 3, fontWeight: 400 }}>px/s</span>
                )}
              </div>
              <Bar value={m!.avg_mouse_speed} max={800} color="#8b6bd6" />
              <Row label="Steadiness" value={jitterLabel(m!.avg_mouse_jitter)} />
              <Row label="Clicks" value={num(m!.total_clicks)} />
              <Row label="Scrolls" value={num(m!.total_scrolls)} />
            </MetricCard>
          </div>

          {/* System — full width */}
          <div style={{ marginTop: 8 }}>
            <MetricCard title="System">
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", marginBottom: 2 }}>CPU</div>
                  <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
                    {pct(m!.avg_cpu)}
                  </div>
                  <Bar value={m!.avg_cpu} max={100} color="#f4a347" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", marginBottom: 2 }}>RAM</div>
                  <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
                    {pct(m!.avg_ram)}
                  </div>
                  <Bar value={m!.avg_ram} max={100} color="#7ec8c8" />
                </div>
              </div>
              <Row label="App switches" value={num(m!.total_app_switches)} />
              <Row label="Most-used app" value={stripExe(m!.top_app)} />
            </MetricCard>
          </div>
        </>
      )}
    </div>
  );
}
