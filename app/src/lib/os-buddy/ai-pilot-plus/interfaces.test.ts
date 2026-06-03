import { describe, expect, it } from "vitest";
import {
  AI_PILOT_PLUS_PAGE_CONTEXT_TO_SURFACE,
  DEFAULT_AI_PILOT_PLUS_SETTINGS,
  createAIPilotPlusCountdownState,
  createAIPilotPlusGestureEvent,
  isAIPilotPlusPageContext,
  normalizeAIPilotPlusPageContext,
  type AIPilotPlusActionBinding,
} from "./interfaces";

describe("AI Pilot Plus interfaces", () => {
  it("normalizes product page contexts into the shared vocabulary", () => {
    expect(normalizeAIPilotPlusPageContext("brain")).toBe("brain");
    expect(normalizeAIPilotPlusPageContext("Idea Capture")).toBe("ideaCapture");
    expect(normalizeAIPilotPlusPageContext("project-board")).toBe("project");
    expect(normalizeAIPilotPlusPageContext("Play Ball training")).toBe("playBall");
    expect(normalizeAIPilotPlusPageContext("modal:confirm")).toBe("popup");
    expect(normalizeAIPilotPlusPageContext("calendar")).toBe("unknown");
    expect(isAIPilotPlusPageContext("ideaCapture")).toBe(true);
  });

  it("maps page contexts to existing action-router surfaces", () => {
    expect(AI_PILOT_PLUS_PAGE_CONTEXT_TO_SURFACE.brain).toBe("brain");
    expect(AI_PILOT_PLUS_PAGE_CONTEXT_TO_SURFACE.ideaCapture).toBe("ideas");
    expect(AI_PILOT_PLUS_PAGE_CONTEXT_TO_SURFACE.project).toBe("projects");
    expect(AI_PILOT_PLUS_PAGE_CONTEXT_TO_SURFACE.playBall).toBe("play-ball");
  });

  it("creates clamped gesture events with stable ids", () => {
    const event = createAIPilotPlusGestureEvent({
      timestamp: 2_000,
      type: "circleClockwise",
      confidence: 1.8,
      handedness: "right",
      handsInvolved: 1,
      position: { x: 120, y: 140 },
    });

    expect(event.id).toBe("circleClockwise:2000");
    expect(event.confidence).toBe(1);
    expect(event.position).toEqual({ x: 120, y: 140 });
  });

  it("computes countdown progress and inactive fallback", () => {
    expect(
      createAIPilotPlusCountdownState({
        kind: "plusActivation",
        now: 1_500,
        startedAt: 1_000,
        durationMs: 2_000,
        label: "AI Pilot Plus activating...",
      }),
    ).toEqual({
      kind: "plusActivation",
      startedAt: 1_000,
      durationMs: 2_000,
      progress: 0.25,
      label: "AI Pilot Plus activating...",
    });

    expect(
      createAIPilotPlusCountdownState({
        kind: "inactive",
        now: 1_500,
        startedAt: 1_000,
        durationMs: 2_000,
        label: "ignored",
      }).progress,
    ).toBe(0);
  });

  it("keeps configurable action bindings typed", () => {
    const binding: AIPilotPlusActionBinding = {
      id: "brain-capture",
      pageContext: "brain",
      gesture: "pinchMiddle",
      mode: "plusActive",
      action: { type: "CAPTURE_KNOWLEDGE" },
      cooldownMs: 1_000,
      enabled: true,
    };

    expect(binding.action.type).toBe("CAPTURE_KNOWLEDGE");
    expect(DEFAULT_AI_PILOT_PLUS_SETTINGS.plusCountdownMs).toBe(2_000);
  });
});
