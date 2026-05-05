import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Keyboard,
  Mouse,
  MousePointerClick,
  Cpu,
  AppWindow,
  Monitor,
  Clipboard,
  CalendarDays,
  Lock,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import wispPng from "../assets/sprites/wisp.png";
import { onboarding as copy } from "../lib/dialogue";

const STEPS = ["welcome", "tier1", "screen", "clipboard", "calendar", "ai_choice", "ai_provider", "ai_key", "summary"] as const;
type Step = typeof STEPS[number];

interface Choices {
  screen: boolean;
  clipboard: boolean;
  calendar: boolean;
}

// ── Icon maps ─────────────────────────────────────────────────────────────────

const SENSOR_ICONS: Record<string, React.ReactNode> = {
  keyboard: <Keyboard size={15} strokeWidth={1.6} />,
  mouse:    <Mouse    size={15} strokeWidth={1.6} />,
  click:    <MousePointerClick size={15} strokeWidth={1.6} />,
  cpu:      <Cpu      size={15} strokeWidth={1.6} />,
  windows:  <AppWindow size={15} strokeWidth={1.6} />,
};

const PERM_ICONS: Record<string, React.ReactNode> = {
  screen:    <Monitor     size={18} strokeWidth={1.5} />,
  clipboard: <Clipboard   size={18} strokeWidth={1.5} />,
  calendar:  <CalendarDays size={18} strokeWidth={1.5} />,
};

// ── Styles ────────────────────────────────────────────────────────────────────

const root: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  // 80px pad all sides — gives the shadow room to render without clipping
  padding: 80,
  boxSizing: "border-box",
};

const panel: React.CSSProperties = {
  width: 420,
  // No maxHeight, no overflow — let content set the height naturally
  background: "rgba(14,14,24,0.97)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 20,
  // Tight layered shadow — stays within the 80px padding budget
  boxShadow: [
    "0 2px 6px rgba(0,0,0,0.20)",
    "0 8px 24px rgba(0,0,0,0.24)",
    "0 20px 40px rgba(0,0,0,0.20)",
  ].join(", "),
  color: "rgba(255,255,255,0.88)",
  fontFamily: "system-ui, -apple-system, sans-serif",
  fontSize: 13,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const dragBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 14px 0 18px",
  cursor: "grab",
  userSelect: "none",
  flexShrink: 0,
  WebkitUserSelect: "none",
};

const btnPrimary: React.CSSProperties = {
  background: "rgba(107,163,214,0.18)",
  border: "1px solid rgba(107,163,214,0.40)",
  borderRadius: 10,
  padding: "11px 0",
  fontSize: 13,
  fontWeight: 600,
  color: "rgba(107,163,214,0.95)",
  cursor: "pointer",
  fontFamily: "inherit",
  width: "100%",
  transition: "background 150ms ease",
};

const btnBack: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 10,
  padding: "11px 16px",
  fontSize: 13,
  fontWeight: 600,
  color: "rgba(255,255,255,0.40)",
  cursor: "pointer",
  fontFamily: "inherit",
  flexShrink: 0,
  width: "auto",
  transition: "background 150ms ease",
};

// ── Shared sub-components ─────────────────────────────────────────────────────

function ProgressDots({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step);
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {STEPS.map((s, i) => (
        <div
          key={s}
          style={{
            width: i === idx ? 14 : 5,
            height: 5,
            borderRadius: 3,
            background: i <= idx ? "rgba(107,163,214,0.70)" : "rgba(255,255,255,0.10)",
            transition: "width 200ms ease, background 200ms ease",
          }}
        />
      ))}
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 7,
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "rgba(255,255,255,0.35)",
        padding: 0,
        transition: "background 150ms ease, color 150ms ease",
        flexShrink: 0,
      }}
      title="Close"
    >
      <X size={12} strokeWidth={2} />
    </button>
  );
}

function IconBox({
  children,
  accent = false,
  size = 34,
}: {
  children: React.ReactNode;
  accent?: boolean;
  size?: number;
}) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 9,
      background: accent ? "rgba(107,163,214,0.10)" : "rgba(107,214,163,0.08)",
      border: `1px solid ${accent ? "rgba(107,163,214,0.20)" : "rgba(107,214,163,0.16)"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: accent ? "rgba(107,163,214,0.80)" : "rgba(107,214,163,0.75)",
      flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

// Placeholder slot for a generated illustration.
function AssetPlaceholder({ label, height = 100 }: { label: string; height?: number }) {
  return (
    <div style={{
      height,
      borderRadius: 12,
      border: "1.5px dashed rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.018)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      color: "rgba(255,255,255,0.16)",
      fontSize: 11,
      fontStyle: "italic",
    }}>
      <div style={{ opacity: 0.5, marginBottom: 2 }}>
        <Monitor size={18} strokeWidth={1.4} />
      </div>
      <div>{label}</div>
      <div style={{ fontSize: 10, opacity: 0.6 }}>400 × {height}px</div>
    </div>
  );
}

function PermissionOption({
  chosen,
  onChoose,
  yesLabel,
  noLabel,
}: {
  chosen: boolean | null;
  onChoose: (v: boolean) => void;
  yesLabel: string;
  noLabel: string;
}) {
  function optStyle(active: boolean, isYes: boolean): React.CSSProperties {
    return {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      padding: "10px 0",
      borderRadius: 10,
      border: `1px solid ${active
        ? isYes ? "rgba(107,163,214,0.45)" : "rgba(255,255,255,0.18)"
        : "rgba(255,255,255,0.07)"}`,
      background: active
        ? isYes ? "rgba(107,163,214,0.14)" : "rgba(255,255,255,0.06)"
        : "rgba(255,255,255,0.02)",
      color: active
        ? isYes ? "rgba(107,163,214,0.90)" : "rgba(255,255,255,0.65)"
        : "rgba(255,255,255,0.30)",
      fontSize: 12,
      cursor: "pointer",
      fontFamily: "inherit",
      transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
    };
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={() => onChoose(true)} style={optStyle(chosen === true, true)}>
        <Check size={13} strokeWidth={2.2} /> {yesLabel}
      </button>
      <button onClick={() => onChoose(false)} style={optStyle(chosen === false, false)}>
        <X size={13} strokeWidth={2.2} /> {noLabel}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [step, setStep] = useState<Step>("welcome");
  const [choices, setChoices] = useState<{
    screen: boolean | null;
    clipboard: boolean | null;
    calendar: boolean | null;
  }>({ screen: null, clipboard: null, calendar: null });
  const [finishing, setFinishing] = useState(false);

  // AI inference state
  const [inferenceChoice, setInferenceChoice] = useState<"cloud" | "local" | "skip" | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);

  useEffect(() => {
    invoke<{ screen: boolean; clipboard: boolean; calendar: boolean }>("get_tier2_permissions")
      .then((saved) => {
        setChoices({
          screen: saved.screen,
          clipboard: saved.clipboard,
          calendar: saved.calendar,
        });
      })
      .catch(() => {});
  }, []);

  function next() {
    if (step === "ai_choice") {
      if (inferenceChoice === "cloud") { setStep("ai_provider"); return; }
      // skip and local both go to summary (local shows dead-end inline, skip handled via button)
      setStep("summary");
      return;
    }
    if (step === "ai_key") { setStep("summary"); return; }
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  function back() {
    if (step === "ai_key") { setStep("ai_provider"); return; }
    if (step === "ai_provider") { setStep("ai_choice"); return; }
  }

  async function handleSaveApiKey() {
    const trimmed = apiKey.trim();
    if (!trimmed.startsWith("sk-or-")) {
      setApiKeyError("Key must start with sk-or-");
      return;
    }
    setApiKeySaving(true);
    setApiKeyError("");
    try {
      await invoke("set_api_key", { key: trimmed });
      setApiKeySaved(true);
    } catch {
      setApiKeyError("Failed to save key. Please try again.");
    } finally {
      setApiKeySaving(false);
    }
  }

  function dismiss() {
    invoke("dismiss_onboarding").catch(console.error);
  }

  async function finish() {
    setFinishing(true);
    await invoke("complete_onboarding", {
      choices: {
        screen: choices.screen ?? false,
        clipboard: choices.clipboard ?? false,
        calendar: choices.calendar ?? false,
        inference_provider: apiKeySaved ? "openrouter" : "skipped",
      } satisfies Choices & { inference_provider: string },
    }).catch(console.error);
  }

  const s = copy.summary;

  return (
    <div style={root}>
      <div style={panel}>
        {/* Drag bar */}
        <div data-tauri-drag-region style={dragBar}>
          <ProgressDots step={step} />
          <CloseBtn onClick={dismiss} />
        </div>

        {/* Content — no scroll, no height cap, grows with its content */}
        <div style={{ padding: "20px 24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* ── Welcome ── */}
          {step === "welcome" && (
            <>
              <AssetPlaceholder label="Wisp welcome illustration" height={110} />

              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <img
                  src={wispPng}
                  alt="Wisp"
                  style={{ width: 46, height: 46, imageRendering: "pixelated", flexShrink: 0, marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.92)", marginBottom: 6 }}>
                    {copy.welcome.heading}
                  </div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.46)", lineHeight: 1.72 }}>
                    {copy.welcome.body}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "rgba(255,255,255,0.20)" }}>
                <Lock size={12} strokeWidth={1.8} />
                {copy.welcome.footer}
              </div>

              <button style={btnPrimary} onClick={next}>
                {copy.welcome.cta} &rarr;
              </button>
            </>
          )}

          {/* ── Tier 1 ── */}
          {step === "tier1" && (
            <>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 5 }}>
                  {copy.tier1.heading}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", lineHeight: 1.65 }}>
                  {copy.tier1.subtext}
                </div>
              </div>

              {/* Placeholder: data-flow diagram (sensor event → aggregate → no raw storage) */}
              <AssetPlaceholder label="Data flow diagram: raw event → pattern summary → stored" height={76} />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {copy.tier1.sensors.map((sensor) => (
                  <div
                    key={sensor.key}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "10px 12px",
                      background: "rgba(255,255,255,0.025)",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.06)",
                      alignItems: "flex-start",
                    }}
                  >
                    <IconBox>{SENSOR_ICONS[sensor.key]}</IconBox>
                    <div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", fontWeight: 500, marginBottom: 2 }}>
                        {sensor.name}
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", lineHeight: 1.55 }}>
                        {sensor.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button style={btnPrimary} onClick={next}>
                {copy.tier1.cta} &rarr;
              </button>
            </>
          )}

          {/* ── Permission screens ── */}
          {(step === "screen" || step === "clipboard" || step === "calendar") && (() => {
            const c = copy[step];
            const chosen = choices[step];
            return (
              <>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <IconBox accent size={38}>
                    {PERM_ICONS[step]}
                  </IconBox>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                    {c.heading}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.65)", marginBottom: 6 }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.36)", lineHeight: 1.68 }}>
                    {c.desc}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 12px", background: "rgba(255,160,60,0.04)", border: "1px solid rgba(255,160,60,0.13)", borderRadius: 9 }}>
                  <AlertTriangle size={13} strokeWidth={1.8} style={{ color: "rgba(255,160,60,0.55)", marginTop: 1, flexShrink: 0 }} />
                  <div style={{ fontSize: 11, color: "rgba(255,160,60,0.52)", lineHeight: 1.6 }}>{c.risk}</div>
                </div>

                <PermissionOption
                  chosen={chosen}
                  onChoose={(v) => setChoices((prev) => ({ ...prev, [step]: v }))}
                  yesLabel={c.yes}
                  noLabel={c.no}
                />

                {chosen !== null && (
                  <button style={btnPrimary} onClick={next}>Next &rarr;</button>
                )}
              </>
            );
          })()}

          {/* ── AI Choice ── */}
          {step === "ai_choice" && (
            <>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 5 }}>
                  how should wisp think?
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", lineHeight: 1.65 }}>
                  Wisp needs an AI to turn your behavioral patterns into insights. Choose how it should work.
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Cloud card */}
                <button
                  onClick={() => setInferenceChoice("cloud")}
                  style={{
                    background: inferenceChoice === "cloud" ? "rgba(107,163,214,0.12)" : "rgba(255,255,255,0.025)",
                    border: `1px solid ${inferenceChoice === "cloud" ? "rgba(107,163,214,0.40)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "background 150ms ease, border-color 150ms ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Cloud</div>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: "2px 7px",
                      borderRadius: 4,
                      background: "rgba(107,214,163,0.10)",
                      border: "1px solid rgba(107,214,163,0.22)",
                      color: "rgba(107,214,163,0.80)",
                    }}>
                      recommended
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.6, marginBottom: 8 }}>
                    Fast and powerful. Uses OpenRouter to access frontier models — completely free to set up with your own API key.
                    Wisp is designed to be lightweight, and local AI consumes too much RAM and CPU for a passive background app.
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,160,60,0.50)", lineHeight: 1.55, display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <AlertTriangle size={11} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      This is the only part of Wisp that leaves your device. What's sent is a plain-language behavioral description — no raw input, no content, no personal identifiers.
                    </span>
                  </div>
                </button>

                {/* Local card — coming soon */}
                <button
                  onClick={() => setInferenceChoice("local")}
                  style={{
                    background: inferenceChoice === "local" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)",
                    border: `1px solid ${inferenceChoice === "local" ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    opacity: 0.6,
                    transition: "background 150ms ease, border-color 150ms ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.70)" }}>Local</div>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: "2px 7px",
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: "rgba(255,255,255,0.35)",
                    }}>
                      coming soon
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", lineHeight: 1.6 }}>
                    Fully private — nothing ever leaves your device. Requires Ollama running locally.
                  </div>
                </button>
              </div>

              {/* Local dead-end message */}
              {inferenceChoice === "local" && (
                <div style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.38)",
                  lineHeight: 1.6,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 9,
                }}>
                  Local inference via Ollama is on our roadmap. For now, you can skip AI entirely or use Cloud.
                </div>
              )}

              {/* Skip link */}
              <button
                onClick={() => { setInferenceChoice("skip"); setStep("summary"); }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.28)",
                  fontFamily: "inherit",
                  padding: 0,
                  textAlign: "center",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Skip for now — Wisp will still track your state, just won't generate insights
              </button>

              {/* Continue button — only visible when Cloud is selected */}
              {inferenceChoice === "cloud" && (
                <button style={btnPrimary} onClick={next}>
                  Continue &rarr;
                </button>
              )}
            </>
          )}

          {/* ── AI Provider ── */}
          {step === "ai_provider" && (
            <>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 5 }}>
                  choose a provider
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", lineHeight: 1.65 }}>
                  Your API key stays on your device. Wisp sends a short plain-text description — never raw data.
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* OpenRouter — real option, pre-selected */}
                <div style={{
                  background: "rgba(107,163,214,0.12)",
                  border: "1px solid rgba(107,163,214,0.40)",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>OpenRouter</div>
                    <div style={{
                      fontSize: 10,
                      fontWeight: 500,
                      padding: "2px 7px",
                      borderRadius: 4,
                      background: "rgba(107,163,214,0.14)",
                      border: "1px solid rgba(107,163,214,0.30)",
                      color: "rgba(107,163,214,0.85)",
                    }}>
                      selected
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>
                    Access to GPT-4o, Claude, Gemini, and more. Free API key, pay only for what you use.
                  </div>
                </div>

                {/* Anthropic Direct — stub */}
                <div style={{
                  background: "rgba(255,255,255,0.015)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  opacity: 0.45,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>Anthropic Direct</div>
                  <div style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "rgba(255,255,255,0.30)",
                  }}>
                    coming soon
                  </div>
                </div>

                {/* Google AI Studio — stub */}
                <div style={{
                  background: "rgba(255,255,255,0.015)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  opacity: 0.45,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>Google AI Studio</div>
                  <div style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "rgba(255,255,255,0.30)",
                  }}>
                    coming soon
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={back} style={btnBack}>← Back</button>
                <button style={{ ...btnPrimary, flex: 1, width: "auto" }} onClick={next}>
                  Use OpenRouter &rarr;
                </button>
              </div>
            </>
          )}

          {/* ── AI Key ── */}
          {step === "ai_key" && (
            <>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 5 }}>
                  add your openrouter key
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", lineHeight: 1.65 }}>
                  Paste your key below. Wisp will start generating insights as soon as it has enough data.
                </div>
              </div>

              {apiKeySaved ? (
                <div style={{
                  background: "rgba(107,214,163,0.07)",
                  border: "1px solid rgba(107,214,163,0.22)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}>
                  <Check size={14} strokeWidth={2} style={{ color: "rgba(107,214,163,0.80)", flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: "rgba(107,214,163,0.80)" }}>Key saved securely.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="password"
                      placeholder="sk-or-…"
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); setApiKeyError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && apiKey.trim()) handleSaveApiKey(); }}
                      style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.06)",
                        border: `1px solid ${apiKeyError ? "rgba(204,68,0,0.50)" : "rgba(255,255,255,0.12)"}`,
                        borderRadius: 8,
                        padding: "9px 12px",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.85)",
                        fontFamily: "monospace",
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={!apiKey.trim() || apiKeySaving}
                      style={{
                        background: apiKey.trim() ? "rgba(107,163,214,0.18)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${apiKey.trim() ? "rgba(107,163,214,0.40)" : "rgba(255,255,255,0.09)"}`,
                        borderRadius: 8,
                        padding: "9px 14px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: apiKey.trim() ? "rgba(107,163,214,0.90)" : "rgba(255,255,255,0.25)",
                        cursor: apiKey.trim() ? "pointer" : "default",
                        fontFamily: "inherit",
                        flexShrink: 0,
                      }}
                    >
                      {apiKeySaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                  {apiKeyError && (
                    <div style={{ fontSize: 11, color: "rgba(204,68,0,0.85)" }}>{apiKeyError}</div>
                  )}
                </div>
              )}

              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", lineHeight: 1.6 }}>
                Your key is stored only in Windows Credential Manager on this device. Wisp never transmits it, never logs it, never sees it after you save it.{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "rgba(107,163,214,0.55)", textDecoration: "underline", textUnderlineOffset: 2 }}
                >
                  Get a free API key →
                </a>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={back} style={btnBack}>← Back</button>
                <button
                  style={{ ...btnPrimary, flex: 1, width: "auto" }}
                  onClick={() => setStep("summary")}
                >
                  {apiKeySaved ? "Continue →" : "Skip for now →"}
                </button>
              </div>
            </>
          )}

          {/* ── Summary ── */}
          {step === "summary" && (
            <>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <img
                  src={wispPng}
                  alt="Wisp"
                  style={{ width: 44, height: 44, imageRendering: "pixelated", flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
                    {s.heading}
                  </div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.36)", lineHeight: 1.68 }}>
                    {s.body}
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {s.choicesLabel}
                </div>
                {(["screen", "clipboard", "calendar"] as const).map((key) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 9, alignItems: "center", color: "rgba(255,255,255,0.52)" }}>
                      <span style={{ color: "rgba(107,163,214,0.60)" }}>{PERM_ICONS[key]}</span>
                      {s.choiceLabels[key]}
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: choices[key] ? "rgba(107,214,163,0.80)" : "rgba(255,255,255,0.22)",
                      background: choices[key] ? "rgba(107,214,163,0.07)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${choices[key] ? "rgba(107,214,163,0.16)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 5,
                      padding: "2px 8px",
                    }}>
                      {choices[key] ? "On" : "Off"}
                    </span>
                  </div>
                ))}
                {/* AI inference row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 8 }}>
                  <div style={{ color: "rgba(255,255,255,0.52)" }}>AI insights</div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: apiKeySaved ? "rgba(107,214,163,0.80)" : "rgba(255,255,255,0.22)",
                    background: apiKeySaved ? "rgba(107,214,163,0.07)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${apiKeySaved ? "rgba(107,214,163,0.16)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 5,
                    padding: "2px 8px",
                  }}>
                    {apiKeySaved ? "Cloud" : "Off"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.18)", fontStyle: "italic" }}>
                  <Lock size={10} strokeWidth={1.8} />
                  {s.settingsNote}
                </div>
              </div>

              <button
                style={{ ...btnPrimary, opacity: finishing ? 0.5 : 1 }}
                onClick={finish}
                disabled={finishing}
              >
                {finishing ? s.ctaLoading : `${s.cta} →`}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
