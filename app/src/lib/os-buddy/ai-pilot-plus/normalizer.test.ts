import { describe, expect, it } from "vitest";
import type { AirTouchReading } from "../air-control/types";
import type {
  OSBuddyAirControlHand,
  OSBuddyAirControlLandmark,
} from "../os-buddy-air-control-types";
import {
  getAIPilotPlusIndexPalmVector,
  getAIPilotPlusPalmCenter,
  normalizeAIPilotPlusFrame,
} from "./normalizer";

function makeHand(): OSBuddyAirControlHand {
  const landmarks: OSBuddyAirControlLandmark[] = new Array(21)
    .fill(null)
    .map(() => ({ x: 0.2, y: 0.5, z: 0 }));

  landmarks[0] = { x: 0.2, y: 0.5, z: 0 };
  landmarks[5] = { x: 0.2, y: 0.5, z: 0 };
  landmarks[8] = { x: 0.4, y: 0.2, z: 0 };
  landmarks[9] = { x: 0.2, y: 0.5, z: 0 };
  landmarks[13] = { x: 0.2, y: 0.5, z: 0 };
  landmarks[17] = { x: 0.2, y: 0.5, z: 0 };

  return {
    landmarks,
    handedness: "Right",
    confidence: 0.9,
    gestureName: "Pointing_Up",
    gestureScore: 0.9,
  };
}

function reading(overrides: Partial<AirTouchReading> = {}): AirTouchReading {
  return {
    timestamp: 1_000,
    fingertip: { x: 400, y: 100 },
    isIndexExtended: true,
    gesture: "Index_Point",
    confidence: 0.8,
    mode: "2d",
    sensorMode: "rgb-webcam",
    ...overrides,
  };
}

describe("AI Pilot Plus normalizer", () => {
  it("builds a screen-space palm center and index-palm vector", () => {
    const frame = normalizeAIPilotPlusFrame({
      active: true,
      now: 1_000,
      viewport: { width: 1_000, height: 500 },
      reading: reading(),
      primaryHand: makeHand(),
      mirrored: false,
    });

    expect(frame.cursor).toEqual({ x: 400, y: 100 });
    expect(frame.palm).toEqual({ x: 200, y: 250 });
    expect(frame.indexPalmVector).toEqual({ x: 200, y: -150 });
    expect(frame.gesture).toBe("Index_Point");
    expect(frame.handCount).toBe(1);
  });

  it("uses raw cursor and raw palm when the runtime supplies them", () => {
    const frame = normalizeAIPilotPlusFrame({
      active: true,
      now: 1_000,
      viewport: { width: 1_000, height: 500 },
      primaryHand: makeHand(),
      rawCursor: { x: 410, y: 120 },
      rawPalmCursor: { x: 200, y: 260 },
      mirrored: false,
    });

    expect(frame.rawCursor).toEqual({ x: 410, y: 120 });
    expect(frame.palm).toEqual({ x: 200, y: 260 });
    expect(frame.indexPalmVector).toEqual({ x: 210, y: -140 });
  });

  it("averages the stable palm landmarks", () => {
    expect(getAIPilotPlusPalmCenter(makeHand())).toEqual({ x: 0.2, y: 0.5, z: 0 });
    expect(
      getAIPilotPlusIndexPalmVector({
        index: { x: 25, y: 40 },
        palm: { x: 10, y: 20 },
      }),
    ).toEqual({ x: 15, y: 20 });
  });
});
