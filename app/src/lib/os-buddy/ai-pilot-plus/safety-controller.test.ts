import { describe, expect, it } from "vitest";
import { resolveAIPilotPlusGestureBinding } from "./gesture-bindings";
import { createAIPilotPlusGestureEvent } from "./interfaces";
import {
  createAIPilotPlusSafetyState,
  guardAIPilotPlusAction,
  type AIPilotPlusSafetyState,
} from "./safety-controller";

function event(type: Parameters<typeof createAIPilotPlusGestureEvent>[0]["type"], timestamp = 1_000) {
  return createAIPilotPlusGestureEvent({
    timestamp,
    type,
    confidence: 0.95,
  });
}

function resolution(type: Parameters<typeof event>[0], pageContext: "brain" | "project" = "brain") {
  const resolved = resolveAIPilotPlusGestureBinding({
    event: event(type),
    pageContext,
    mode: "plusActive",
  });
  if (!resolved) throw new Error(`Missing test binding for ${type}`);
  return resolved;
}

describe("AI Pilot Plus safety controller", () => {
  it("allows non-confirmation actions immediately", () => {
    const decision = guardAIPilotPlusAction({
      previous: createAIPilotPlusSafetyState(),
      now: 1_000,
      resolution: resolution("pinchMiddle"),
      event: event("pinchMiddle"),
    });

    expect(decision.allowed).toBe(true);
    expect(decision.action?.type).toBe("CAPTURE_KNOWLEDGE");
    expect(decision.next.pendingConfirmation).toBeNull();
  });

  it("blocks repeated actions during cooldown", () => {
    const first = guardAIPilotPlusAction({
      previous: createAIPilotPlusSafetyState(),
      now: 1_000,
      resolution: resolution("pinchMiddle"),
      event: event("pinchMiddle"),
    });

    const second = guardAIPilotPlusAction({
      previous: first.next,
      now: 1_200,
      resolution: resolution("pinchMiddle"),
      event: event("pinchMiddle", 1_200),
    });

    expect(second.allowed).toBe(false);
    expect(second.blockedReason).toBe("cooldown");
  });

  it("requires an explicit confirm gesture for protected actions", () => {
    const projectDone = resolution("fist", "project");
    const first = guardAIPilotPlusAction({
      previous: createAIPilotPlusSafetyState(),
      now: 1_000,
      resolution: projectDone,
      event: event("fist"),
    });

    expect(first.allowed).toBe(false);
    expect(first.blockedReason).toBe("confirmation-required");
    expect(first.pendingConfirmation?.action.type).toBe("PROJECT_MARK_DONE");

    const confirm = guardAIPilotPlusAction({
      previous: first.next,
      now: 1_600,
      resolution: projectDone,
      event: event("pinchIndex", 1_600),
    });

    expect(confirm.allowed).toBe(true);
    expect(confirm.action?.type).toBe("PROJECT_MARK_DONE");
    expect(confirm.next.pendingConfirmation).toBeNull();
  });

  it("restarts confirmation when the pending action expires", () => {
    const projectDone = resolution("fist", "project");
    const previous: AIPilotPlusSafetyState = guardAIPilotPlusAction({
      previous: createAIPilotPlusSafetyState(),
      now: 1_000,
      resolution: projectDone,
      event: event("fist"),
      confirmationWindowMs: 500,
    }).next;

    const expired = guardAIPilotPlusAction({
      previous,
      now: 1_800,
      resolution: projectDone,
      event: event("pinchIndex", 1_800),
      confirmationWindowMs: 500,
    });

    expect(expired.allowed).toBe(false);
    expect(expired.blockedReason).toBe("confirmation-expired");
    expect(expired.pendingConfirmation?.expiresAt).toBe(2_300);
  });
});
