import { describe, expect, it } from "vitest";
import { createAIPilotPlusGestureEvent } from "./interfaces";
import { resolveAIPilotPlusGestureBinding } from "./gesture-bindings";
import { resolveAIPilotPlusPageContextFromPathname } from "./page-context";

function event(type: Parameters<typeof createAIPilotPlusGestureEvent>[0]["type"], metadata?: Record<string, unknown>) {
  return createAIPilotPlusGestureEvent({
    timestamp: 1_000,
    type,
    confidence: 0.95,
    metadata,
  });
}

describe("AI Pilot Plus page context", () => {
  it("resolves protected app routes into gesture page contexts", () => {
    expect(resolveAIPilotPlusPageContextFromPathname("/zh-TW/brain")).toBe("brain");
    expect(resolveAIPilotPlusPageContextFromPathname("/en/ideas")).toBe("ideaCapture");
    expect(resolveAIPilotPlusPageContextFromPathname("/en/projects")).toBe("project");
    expect(resolveAIPilotPlusPageContextFromPathname("/en/os-buddy/play-ball")).toBe("playBall");
    expect(resolveAIPilotPlusPageContextFromPathname("/en/calendar")).toBe("unknown");
  });
});

describe("AI Pilot Plus gesture bindings", () => {
  it("prefers exact page bindings over global bindings", () => {
    const resolution = resolveAIPilotPlusGestureBinding({
      event: event("pinchMiddle"),
      pageContext: "brain",
      mode: "plusActive",
    });

    expect(resolution?.binding.id).toBe("brain-capture");
    expect(resolution?.action.type).toBe("CAPTURE_KNOWLEDGE");
  });

  it("routes Ideas and Projects gestures to page-level actions", () => {
    expect(
      resolveAIPilotPlusGestureBinding({
        event: event("swipeUp"),
        pageContext: "ideaCapture",
        mode: "plusActive",
      })?.action.type,
    ).toBe("IDEA_PROMOTE_TO_PROJECT");

    expect(
      resolveAIPilotPlusGestureBinding({
        event: event("fist"),
        pageContext: "project",
        mode: "plusActive",
      })?.action.type,
    ).toBe("PROJECT_MARK_DONE");
  });

  it("keeps popup gestures scoped to popup actions", () => {
    const resolution = resolveAIPilotPlusGestureBinding({
      event: event("openPalm"),
      pageContext: "popup",
      mode: "plusActive",
    });

    expect(resolution?.binding.id).toBe("popup-cancel");
    expect(resolution?.action.type).toBe("CANCEL");
  });

  it("requires Plus mode for advanced page actions", () => {
    expect(
      resolveAIPilotPlusGestureBinding({
        event: event("twoHandSpread"),
        pageContext: "brain",
        mode: "normal",
      }),
    ).toBeNull();
  });

  it("supports global circle zoom and four-finger command palette", () => {
    expect(
      resolveAIPilotPlusGestureBinding({
        event: event("circleClockwise"),
        pageContext: "brain",
        mode: "plusActive",
      })?.action,
    ).toEqual({ type: "ZOOM_OSBUDDY", direction: "in", amount: 0.16 });

    expect(
      resolveAIPilotPlusGestureBinding({
        event: event("fingerCount", { count: 4 }),
        pageContext: "global",
        mode: "plusActive",
      })?.action.type,
    ).toBe("OPEN_COMMAND_PALETTE");
  });
});
