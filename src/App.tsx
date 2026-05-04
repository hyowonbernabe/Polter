import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import Creature from "./components/Creature";
import InsightBubble from "./components/InsightBubble";
import { getBubblePosition } from "./lib/bubblePosition";
import { usePreInsightGlow } from "./hooks/usePreInsightGlow";
import { useInsightQueue } from "./hooks/useInsightQueue";
import { useCreaturePhysics } from "./hooks/useCreaturePhysics";
import { useIdleDetection } from "./hooks/useIdleDetection";
import { type WispState } from "./lib/spriteConfig";
import { loadPreferences, type CreatureSize, SIZE_MULTIPLIERS } from "./lib/preferences";

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
  const [creatureSize, setCreatureSize] = useState<CreatureSize>("medium");
  const [idleFloor, setIdleFloor] = useState(0.35);

  const burnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const physics = useCreaturePhysics();
  const idleOpacity = useIdleDetection(idleFloor);

  const { current: activeInsight, isFirstEver, enqueue, dismiss } = useInsightQueue();
  const { phase: preInsightPhase } = usePreInsightGlow(glowTriggered, isFirstEver);

  const bubbleVisible = activeInsight !== null && preInsightPhase === 3;

  // Keep physics hook informed of current WispState (mood modifiers)
  useEffect(() => {
    physics.setWispState(wispState);
  }, [wispState, physics.setWispState]);

  // Forward-facing dialogue mode when bubble is showing
  useEffect(() => {
    physics.setDialogue(bubbleVisible);
  }, [bubbleVisible, physics.setDialogue]);

  // Burn distress: arm 90-min timer on burn, cancel on any other state
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

  // Trigger glow sequence when a new insight becomes active
  useEffect(() => {
    if (activeInsight) {
      setBubbleExpanded(false);
      setGlowTriggered(true);
    } else {
      setGlowTriggered(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInsight?.insight]);

  // Load preferences on mount; re-apply when settings window changes them
  useEffect(() => {
    loadPreferences().then((p) => {
      setCreatureSize(p.creature_size);
      setIdleFloor(p.idle_opacity);
    });
    const unlistenSize = listen<CreatureSize>("creature_size_changed", (e) => {
      setCreatureSize(e.payload);
    });
    const unlistenOpacity = listen<number>("idle_opacity_changed", (e) => {
      setIdleFloor(e.payload);
    });
    return () => {
      unlistenSize.then((f) => f());
      unlistenOpacity.then((f) => f());
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
      console.log("[wisp] insight received:", event.payload.type);
      enqueue({ ...event.payload, receivedAt: Date.now() });
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

  // Read creature position from physics element at render time (for bubble placement)
  function getCreaturePos() {
    const el = physics.elementRef.current;
    if (!el) return { x: 100, y: 100 };
    const m = el.style.transform.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 100, y: 100 };
  }

  const displaySize = Math.round(physics.spriteSize * SIZE_MULTIPLIERS[creatureSize]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "transparent" }}>
      <Creature
        displaySize={displaySize}
        state={wispState}
        physicsState={physics.physicsState}
        velocity={physics.velocity}
        facing={physics.facing}
        dragSquish={physics.dragSquish}
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
      {activeInsight && preInsightPhase === 3 && (() => {
        const cp = getCreaturePos();
        const bp = getBubblePosition(
          cp.x, cp.y, physics.spriteSize, physics.spriteSize,
          physics.monitors, 300, window.innerHeight,
        );
        return (
          <InsightBubble
            key={activeInsight.insight}
            insight={activeInsight.insight}
            extended={activeInsight.extended}
            x={bp.x}
            y={bp.y}
            tailSide={bp.tailSide}
            tailOffset={bp.tailOffset}
            onDismiss={handleDismiss}
            onExpand={() => setBubbleExpanded(true)}
            isExpanded={bubbleExpanded}
            isFirstEver={isFirstEver}
          />
        );
      })()}
    </div>
  );
}
