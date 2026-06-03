import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_PILOT_PLUS_CONFIG,
  type AIPilotPlusFrame,
} from "./types";
import {
  detectLockedIndexTap,
  detectTwoHandZoom,
  getAIPilotPlusMagnitude,
  getAIPilotPlusVectorDelta,
} from "./recognizer";

function frame(overrides: Partial<AIPilotPlusFrame>): AIPilotPlusFrame {
  return {
    now: 1_000,
    active: true,
    handCount: 1,
    gesture: "Index_Point",
    confidence: 0.9,
    sensorMode: "rgb-webcam",
    cursor: { x: 100, y: 100 },
    rawCursor: { x: 100, y: 100 },
    palm: { x: 80, y: 140 },
    indexPalmVector: { x: 20, y: -40 },
    primaryHand: null,
    secondaryHand: null,
    secondaryPalm: null,
    target: null,
    lockedTarget: null,
    ...overrides,
  };
}

describe("AI Pilot Plus recognizer", () => {
  it("detects locked index tap from travel relative to the lock baseline", () => {
    const tap = detectLockedIndexTap({
      baseline: { x: 20, y: -40 },
      previous: { x: 20, y: -40 },
      current: { x: 20, y: -30 },
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });

    expect(tap.selected).toBe(true);
    expect(tap.travelPx).toBe(10);
    expect(tap.score).toBeGreaterThan(1);
  });

  it("detects subtle flicks even when baseline travel is small", () => {
    const tap = detectLockedIndexTap({
      baseline: { x: 20, y: -40 },
      previous: { x: 20, y: -39 },
      current: { x: 20, y: -33 },
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });

    expect(tap.selected).toBe(true);
    expect(tap.travelPx).toBeLessThan(DEFAULT_AI_PILOT_PLUS_CONFIG.lockedTapTravelPx);
    expect(tap.flickPx).toBe(6);
  });

  it("returns null for two-hand zoom inside the deadzone", () => {
    const previous = frame({
      palm: { x: 100, y: 100 },
      secondaryPalm: { x: 200, y: 100 },
    });
    const current = frame({
      palm: { x: 101, y: 100 },
      secondaryPalm: { x: 202, y: 100 },
    });

    expect(
      detectTwoHandZoom({
        previous,
        current,
        config: DEFAULT_AI_PILOT_PLUS_CONFIG,
      }),
    ).toBeNull();
  });

  it("detects two-hand zoom from distance changes", () => {
    const previous = frame({
      palm: { x: 100, y: 100 },
      secondaryPalm: { x: 200, y: 100 },
    });
    const current = frame({
      palm: { x: 80, y: 100 },
      secondaryPalm: { x: 230, y: 100 },
    });
    const zoom = detectTwoHandZoom({
      previous,
      current,
      config: DEFAULT_AI_PILOT_PLUS_CONFIG,
    });

    expect(zoom?.center).toEqual({ x: 155, y: 100 });
    expect(zoom?.distanceDeltaPx).toBe(50);
    expect(zoom?.scaleDelta).toBeGreaterThan(0);
  });

  it("computes simple vector deltas", () => {
    const delta = getAIPilotPlusVectorDelta({ x: 1, y: 2 }, { x: 4, y: 6 });

    expect(delta).toEqual({ x: 3, y: 4 });
    expect(getAIPilotPlusMagnitude(delta)).toBe(5);
  });
});
