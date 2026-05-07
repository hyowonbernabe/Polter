import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import Creature from "./components/Creature";
import { usePreInsightGlow } from "./hooks/usePreInsightGlow";
import { useInsightQueue } from "./hooks/useInsightQueue";
import { useCreaturePhysics } from "./hooks/useCreaturePhysics";
import { useIdleDetection } from "./hooks/useIdleDetection";
import { type WispState } from "./lib/spriteConfig";
import { loadPreferences } from "./lib/preferences";
import { PHYSICS } from "./lib/physics";

const BURN_DISTRESS_MS = 90 * 60 * 1_000;

interface StateChangedPayload {
  state: WispState;
  cold_start: boolean;
}

interface SleepChangedPayload {
  sleeping: boolean;
  privacy: boolean;
}

export interface InsightPayload {
  tier: string;
  state: string;
  insight: string;
  extended: string;
  type: string;
  is_first_ever: boolean;
  receivedAt?: number;
}

export default function App() {
  const [wispState, setWispStateR] = useState<WispState>("rest");
  const [coldStart, setColdStart] = useState(true);
  const [showReturning, setShowReturning] = useState(false);
  const [showBestSession, setShowBestSession] = useState(false);
  const [burnDistress, setBurnDistress] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [showWake, setShowWake] = useState(false);
  const [showNod, setShowNod] = useState(false);
  const [bubbleExpanded, setBubbleExpanded] = useState(false);
  const [glowTriggered, setGlowTriggered] = useState(false);
  const [creatureScale, setCreatureScale] = useState<number>(1.0);
  const [idleFloor, setIdleFloor] = useState(0.35);
  const [debugMode, setDebugMode] = useState(false);
  const [activeMutterText, setActiveMutterText] = useState<string | null>(null);

  const burnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const physics = useCreaturePhysics();
  const idleOpacity = useIdleDetection(idleFloor);

  const { current: activeInsight, isFirstEver, enqueue, dismiss } = useInsightQueue();
  const { phase: preInsightPhase } = usePreInsightGlow(glowTriggered, isFirstEver);

  const bubbleVisible = activeInsight !== null && preInsightPhase === 3;

  useEffect(() => {
    physics.setWispState(wispState);
  }, [wispState, physics.setWispState]);

  useEffect(() => {
    physics.setDialogue(bubbleVisible);
  }, [bubbleVisible, physics.setDialogue]);

  useEffect(() => {
    if (burnTimerRef.current !== null) {
      clearTimeout(burnTimerRef.current);
      burnTimerRef.current = null;
    }
    if (wispState === "burn") {
      burnTimerRef.current = setTimeout(() => setBurnDistress(true), BURN_DISTRESS_MS);
    } else {
      setBurnDistress(false);
    }
    return () => {
      if (burnTimerRef.current !== null) {
        clearTimeout(burnTimerRef.current);
        burnTimerRef.current = null;
      }
    };
  }, [wispState]);

  useEffect(() => {
    if (activeInsight) {
      setBubbleExpanded(false);
      setGlowTriggered(true);
    } else {
      setGlowTriggered(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInsight?.insight]);

  // Dismiss bubbles when creature is grabbed or thrown
  useEffect(() => {
    if (physics.physicsState === 'tether_grab' || physics.physicsState === 'thrown') {
      invoke("dismiss_insight");
      dismiss();
      setActiveMutterText(null);
    }
  }, [physics.physicsState, dismiss]);

  useEffect(() => {
    loadPreferences().then((p) => {
      setCreatureScale(p.creature_scale);
      setIdleFloor(p.idle_opacity);
    });
    const unlistenSize = listen<number>("creature_scale_changed", (e) => {
      setCreatureScale(e.payload);
    });
    const unlistenOpacity = listen<number>("idle_opacity_changed", (e) => {
      setIdleFloor(e.payload);
    });
    const unlistenDebug = listen<boolean>("debug_mode_changed", (e) => {
      setDebugMode(e.payload);
    });
    return () => {
      unlistenSize.then((f) => f());
      unlistenOpacity.then((f) => f());
      unlistenDebug.then((f) => f());
    };
  }, []);

  useEffect(() => {
    const unlistenReady = listen<{ version: string }>("wisp_ready", (event) => {
      console.log("[wisp] bridge confirmed, version:", event.payload.version);
    });
    const unlistenState = listen<StateChangedPayload>("state_changed", (event) => {
      setWispStateR(event.payload.state);
      setColdStart(event.payload.cold_start);
    });
    const unlistenReturning = listen("returning_user", () => setShowReturning(true));
    const unlistenBest = listen("best_session", () => setShowBestSession(true));
    const unlistenSleep = listen<SleepChangedPayload>("sleep_changed", (event) => {
      setSleeping(event.payload.sleeping);
      setPrivacyMode(event.payload.privacy);
    });
    const unlistenWake = listen("wake_animation", () => setShowWake(true));
    const unlistenInsight = listen<InsightPayload>("insight_ready", (event) => {
      if (event.payload.tier === 'mutter') {
        setActiveMutterText(event.payload.insight);
      } else {
        console.log("[wisp] insight received:", event.payload.type);
        enqueue({ ...event.payload, receivedAt: Date.now() });
      }
    });
    return () => {
      unlistenReady.then((f) => f());
      unlistenState.then((f) => f());
      unlistenReturning.then((f) => f());
      unlistenBest.then((f) => f());
      unlistenSleep.then((f) => f());
      unlistenWake.then((f) => f());
      unlistenInsight.then((f) => f());
    };
  }, [enqueue]);

  const handleDismiss = useCallback(() => {
    setShowNod(true);
    invoke("dismiss_insight");
    dismiss();
  }, [dismiss]);

  const handleMutterDismiss = useCallback(() => {
    setActiveMutterText(null);
  }, []);

  const displaySize = Math.round(physics.spriteSize * creatureScale);

  const activeInsightProp = activeInsight && preInsightPhase === 3
    ? {
        text: activeInsight.insight,
        extended: activeInsight.extended,
        isFirstEver,
        isExpanded: bubbleExpanded,
        onDismiss: handleDismiss,
        onExpand: () => setBubbleExpanded(true),
      }
    : null;

  const activeMutterProp = activeMutterText
    ? { text: activeMutterText, onDismiss: handleMutterDismiss }
    : null;

  return (
    <div style={{ width: "100vw", height: "100vh", background: "transparent" }}>
      {debugMode && physics.monitors.map((m, i) => (
        <div key={i} style={{
          position: 'fixed',
          left: m.x,
          top: m.y,
          width: m.width,
          height: m.height,
          border: '1px solid rgba(255, 40, 40, 0.85)',
          pointerEvents: 'none',
          boxSizing: 'border-box',
          zIndex: 9998,
        }}>
          <div style={{
            position: 'absolute',
            inset: PHYSICS.CURSOR_EDGE_MARGIN,
            border: '1px dashed rgba(255, 160, 0, 0.45)',
            boxSizing: 'border-box',
          }} />
          <span style={{
            position: 'absolute',
            top: 4,
            left: 6,
            color: 'rgba(255, 60, 60, 0.85)',
            fontSize: 10,
            fontFamily: 'monospace',
          }}>
            {m.width}×{m.height}
          </span>
        </div>
      ))}
      {debugMode && (
        <div style={{
          position: 'fixed',
          top: 6,
          right: 8,
          color: 'rgba(0, 255, 120, 0.9)',
          fontSize: 10,
          fontFamily: 'monospace',
          pointerEvents: 'none',
          zIndex: 9999,
          background: 'rgba(0,0,0,0.5)',
          padding: '3px 6px',
          borderRadius: 4,
          lineHeight: 1.6,
          whiteSpace: 'nowrap',
        }}>
          <div>state: {physics.physicsState}</div>
          <div>dir: {physics.committedDir} | vel: {Math.round(physics.velocity.x)},{Math.round(physics.velocity.y)}</div>
        </div>
      )}
      <Creature
        displaySize={displaySize}
        state={wispState}
        physicsState={physics.physicsState}
        velocity={physics.velocity}
        facing={physics.facing}
        committedDir={physics.committedDir}
        dragSquish={physics.dragSquish}
        bounceRotation={physics.bounceRotation}
        coldStart={coldStart}
        opacity={idleOpacity}
        showReturning={showReturning}
        showBestSession={showBestSession}
        burnDistress={burnDistress}
        sleeping={sleeping}
        privacyMode={privacyMode}
        showWake={showWake}
        preInsightPhase={preInsightPhase as 0 | 1 | 2 | 3}
        isFirstEverInsight={isFirstEver}
        showNod={showNod}
        bubbleVisible={bubbleVisible}
        activeInsight={activeInsightProp}
        activeMutter={activeMutterProp}
        debugMode={debugMode}
        elementRef={physics.elementRef}
        onPointerDown={(e) => { if (e.button === 0) physics.notifyDragStart(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (e.buttons === 1) physics.notifyDragMove(e.clientX, e.clientY); }}
        onPointerUp={() => physics.notifyDragEnd()}
        onClick={(e) => physics.notifySingleClick(e.clientX, e.clientY)}
        onBubbleClick={() => { physics.notifyBubbleClick(); handleDismiss(); }}
        onReturningDone={() => setShowReturning(false)}
        onBestSessionDone={() => setShowBestSession(false)}
        onWakeDone={() => setShowWake(false)}
        onNodDone={() => setShowNod(false)}
      />
    </div>
  );
}
