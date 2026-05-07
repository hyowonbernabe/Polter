# Polter Permissions and Insight Flow Design Spec

Status: Draft for execution (do not commit)

Date: 2026-05-05

Owner: Polter product and engineering

## Why this work exists

We need one single source of truth for user permission choices, and we need the app to actually obey those choices everywhere.

Right now onboarding saves choices, but settings, dashboard, and inference behavior are not fully driven by the same shared state.

This spec also updates insight behavior to match product direction:

- no daily hard cap,
- keep "tell me more" simple,
- keep fallback lines when no cloud key exists,
- keep file-save and screenshot signals as low-impact background signals,
- remove right-click and zoom signals.

## Final decisions locked in

1. One shared settings object will be the single source of truth.
2. Settings will include a real permission editor (not disabled placeholder).
3. Turning a signal off stops new collection immediately.
4. Old stored summary data stays; only future collection stops.
5. Daily insight cap is removed from the user interface.
6. "Tell me more" shows backend-provided extended text only.
7. Camera and microphone work stays frozen for now.

## Scope boundaries

In scope:

- onboarding permission save and load behavior,
- settings permission editor,
- dashboard visibility of current permission state,
- backend signal gating by permission,
- insight flow updates for no daily hard cap,
- consistency checks across windows.

Out of scope for this cycle:

- camera and microphone feature build,
- personality rewrite,
- major dashboard visual redesign.

## Source of truth contract

Create one shared shape for persisted user choices inside `polter-settings.json`.

Required fields:

- `onboarding_complete`
- `tier2_choices.screen`
- `tier2_choices.clipboard`
- `tier2_choices.calendar`
- `inference_provider`
- any existing stable preferences already used by settings

Rules:

1. Onboarding writes this object.
2. Settings reads and updates this same object.
3. Dashboard reads this same object for display.
4. Backend collection and inference logic reads this same object before using optional signals.
5. No duplicate shadow state in another file.

---

## Execution checklist

Use this checklist in order. Do not skip.

### A. Baseline safety and mapping

- [ ] Confirm current saved keys in `polter-settings.json` are still readable.
- [ ] Add a migration-safe loader that fills missing fields with safe defaults.
- [ ] Define one shared TypeScript type and one shared Rust type for tier choices.
- [ ] Confirm defaults remain opt-in off for Tier 2 choices.

Acceptance checks:

- [ ] Fresh install loads defaults without crash.
- [ ] Existing install with older store format still loads.

### B. Onboarding truth wiring

- [ ] Keep onboarding write path in `src/pages/Onboarding.tsx` and `src-tauri/src/commands.rs`.
- [ ] Add command to read current permission choices from backend store.
- [ ] Ensure onboarding summary reflects actual persisted values, not only local view state.
- [ ] Ensure closing and reopening onboarding preserves selected choices.

Acceptance checks:

- [ ] Toggle each Tier 2 choice in onboarding, finish, reopen, and verify values persist.
- [ ] Verify `inference_provider` is still written correctly.

### C. Settings permission editor (real, not placeholder)

- [ ] Replace disabled permission section in `src/pages/Settings.tsx` with active controls.
- [ ] Replace placeholder `src/components/settings/TierTwoSection.tsx` with live toggles.
- [ ] Wire toggle actions to backend command that updates shared store object.
- [ ] Show plain-language explanation under each toggle.
- [ ] Add immediate visual confirmation after save.

Acceptance checks:

- [ ] Toggle each permission in settings and confirm value persists after app restart.
- [ ] Permission values shown in settings match onboarding and backend store.

### D. Dashboard alignment to shared truth

- [ ] Add dashboard section that shows current Tier 2 permission status from backend.
- [ ] Ensure dashboard never shows stale values after settings change.
- [ ] Keep text simple: on/off and what that means.

Acceptance checks:

- [ ] Change permission in settings while dashboard is open and verify refresh.
- [ ] Restart app and verify dashboard still shows correct values.

### E. Backend gating by permission

- [ ] Add one permission read helper in backend for inference and optional data paths.
- [ ] Gate optional screen analysis by `tier2_choices.screen`.
- [ ] Gate optional clipboard analysis by `tier2_choices.clipboard`.
- [ ] Gate optional calendar context by `tier2_choices.calendar`.
- [ ] Ensure off means stop new collection immediately.
- [ ] Keep already-stored summaries untouched.

Acceptance checks:

- [ ] With each permission off, verify related optional signal is not added to new behavior path.
- [ ] With each permission on, verify behavior resumes.

### F. Insight flow update (no hard cap)

- [ ] Remove "Max insights per day" control from `src/components/settings/InsightControls.tsx`.
- [ ] Keep bubble sound control as is.
- [ ] Remove or ignore `insight_cap_per_day` as an active gate in logic.
- [ ] Keep existing dedup protection and warmup behavior.

Acceptance checks:

- [ ] UI no longer shows daily cap slider.
- [ ] Insight generation still works with existing warmup and dedup.

### G. "Tell me more" behavior

- [ ] Keep `tell me more` button behavior in `src/components/InsightBubble.tsx`.
- [ ] Keep dashboard `more` behavior in `src/components/dashboard/InsightHistory.tsx`.
- [ ] Ensure expanded content uses backend-provided `extended` text directly.
- [ ] Do not add extra formatting rules or scoring labels.

Acceptance checks:

- [ ] Bubble expansion shows extended text and dismiss works.
- [ ] Dashboard history expansion shows same extended text field.

### H. Signal set cleanup and weighting guardrails

- [ ] Remove right-click and zoom-change from active interpretation path.
- [ ] Keep file-save and screenshot as low-impact context only.
- [ ] Ensure low-impact context cannot be the main trigger alone.

Acceptance checks:

- [ ] Unit or integration check confirms weak context signals cannot trigger primary insight alone.

### I. No-key fallback behavior check

- [ ] Keep fallback mutter path in `src-tauri/src/inference/trigger.rs` and `src-tauri/src/inference/pool.rs`.
- [ ] Ensure no API key state still surfaces personality lines.

Acceptance checks:

- [ ] With no API key, mutters continue appearing after warmup.

### J. Verification pass before execution complete

- [ ] Run frontend tests for touched hooks and components.
- [ ] Run Rust tests for touched commands and inference logic.
- [ ] Run app and manually verify onboarding -> settings -> dashboard consistency path.
- [ ] Verify no regressions in wake animation, insight bubble, and dismiss behavior.

Acceptance checks:

- [ ] All related tests pass.
- [ ] Manual flow checklist passes end to end.

---

## Suggested implementation order

1. Shared settings contract and migration-safe loader.
2. Settings live permission editor.
3. Backend permission gating.
4. Dashboard permission visibility.
5. Insight cap removal and fallback verification.
6. Signal cleanup guardrails.
7. Final verification.

## Risks and how to avoid them

Risk: one window shows stale values.

Mitigation:

- Use backend read command for all permission display views.
- Refresh view data on focus and on save success events.

Risk: permission toggle changes text only, not behavior.

Mitigation:

- Add explicit tests that prove optional signals stop when off.

Risk: removing daily cap causes spam.

Mitigation:

- Keep warmup and dedup behavior.
- Keep existing cadence and only remove hard daily count limit.

## Ready-to-execute definition

This spec is ready for implementation when:

- all checklist items in sections A through J are accepted,
- onboarding, settings, and dashboard show matching permission truth,
- optional signal collection obeys toggles immediately,
- insight flow still feels alive without a daily hard cap,
- and no-key fallback mutter behavior still works.
