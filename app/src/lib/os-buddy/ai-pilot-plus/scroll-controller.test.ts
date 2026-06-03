import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_PILOT_PLUS_CONFIG,
  type AIPilotPlusFrame,
} from "./types";
import {
  createAIPilotPlusScrollState,
  stepAIPilotPlusScroll,
} from "./scroll-controller";

function frame(overrides: Partial<AIPilotPlusFrame>): AIPilotPlusFrame {
  return {
    now: 1_000,
    active: true,
    handCount: 1,
    gesture: "Open_Palm",
    confidence: 0.9,
    sensorMode: "rgb-webcam",
    cursor: null,
    rawCursor: null,
    palm: { x: 100, y: 100 },
    indexPalmVector: null,
    primaryHand: null,
    secondaryHand: null,
    secondaryPalm: null,
    target: null,
    lockedTarget: null,
    ...overrides,
  };
}

describe("AI Pilot Plus scroll controller", () => {
  it("anchors on the first open-palm frame", () => {
    const result = stepAIPilotPlusScroll({
      previous: createAIPilotPlusScrollState(),
      frame: frame({ palm: { x: 100, y: 100 } }),
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });

    expect(result.deltaY).toBeNull();
    expect(result.next.status).toBe("anchored");
    expect(result.next.anchorPalm).toEqual({ x: 100, y: 100 });
    expect(result.next.previousPalm).toEqual({ x: 100, y: 100 });
  });

  it("emits smoothed anchor-based scroll after palm movement clears the deadzone", () => {
    const anchored = stepAIPilotPlusScroll({
      previous: createAIPilotPlusScrollState(),
      frame: frame({ palm: { x: 100, y: 100 } }),
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });
    const moved = stepAIPilotPlusScroll({
      previous: anchored.next,
      frame: frame({ now: 1_016, palm: { x: 100, y: 112 } }),
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });

    expect(moved.deltaY).not.toBeNull();
    expect(moved.deltaY).toBeGreaterThan(0);
    expect(moved.deltaY).toBeLessThan(DEFAULT_AI_PILOT_PLUS_CONFIG.scrollMaxDeltaY);
    expect(moved.next.status).toBe("scrolling");
  });

  it("ignores micro movement and resets on non-open gestures", () => {
    const anchored = stepAIPilotPlusScroll({
      previous: createAIPilotPlusScrollState(),
      frame: frame({ palm: { x: 100, y: 100 } }),
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });
    const jitter = stepAIPilotPlusScroll({
      previous: anchored.next,
      frame: frame({ now: 1_016, palm: { x: 100, y: 103 } }),
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });
    const reset = stepAIPilotPlusScroll({
      previous: jitter.next,
      frame: frame({ gesture: "Index_Point", palm: { x: 100, y: 120 } }),
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });

    expect(jitter.deltaY).toBeNull();
    expect(reset.next.previousPalm).toBeNull();
    expect(reset.next.status).toBe("idle");
  });

  it("continues scrolling while the hand holds a stable offset from the anchor", () => {
    const anchored = stepAIPilotPlusScroll({
      previous: createAIPilotPlusScrollState(),
      frame: frame({ now: 1_000, palm: { x: 100, y: 100 } }),
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });
    const moved = stepAIPilotPlusScroll({
      previous: anchored.next,
      frame: frame({ now: 1_050, palm: { x: 100, y: 130 } }),
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });
    const held = stepAIPilotPlusScroll({
      previous: moved.next,
      frame: frame({ now: 1_100, palm: { x: 100, y: 130 } }),
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });

    expect(moved.deltaY).not.toBeNull();
    expect(held.deltaY).not.toBeNull();
    expect(held.next.anchorPalm).toEqual({ x: 100, y: 100 });
  });

  it("adds short inertia after release unless reduced motion is enabled", () => {
    const anchored = stepAIPilotPlusScroll({
      previous: createAIPilotPlusScrollState(),
      frame: frame({ now: 1_000, palm: { x: 100, y: 100 } }),
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });
    const moved = stepAIPilotPlusScroll({
      previous: anchored.next,
      frame: frame({ now: 1_050, palm: { x: 100, y: 150 } }),
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });
    const release = stepAIPilotPlusScroll({
      previous: moved.next,
      frame: frame({ now: 1_080, gesture: "Index_Point", palm: { x: 100, y: 150 } }),
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });
    const reducedRelease = stepAIPilotPlusScroll({
      previous: moved.next,
      frame: frame({ now: 1_080, gesture: "Index_Point", palm: { x: 100, y: 150 } }),
      config: { ...DEFAULT_AI_PILOT_PLUS_CONFIG, scrollReducedMotion: true },
    });

    expect(release.next.status).toBe("inertia");
    expect(release.deltaY).not.toBeNull();
    expect(reducedRelease.next.status).toBe("idle");
    expect(reducedRelease.deltaY).toBeNull();
  });
});
