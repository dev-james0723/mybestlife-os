import { describe, expect, it } from "vitest";
import {
  detectOpenPalmSwipe,
  isPinching,
  mapNormalizedPointToViewport,
  resolveAirControlGesture,
} from "./os-buddy-air-gestures";
import type {
  OSBuddyAirControlFrame,
  OSBuddyAirControlHand,
  OSBuddyAirControlLandmark,
} from "./os-buddy-air-control-types";

function landmarks(overrides: Partial<Record<number, OSBuddyAirControlLandmark>> = {}) {
  const points = Array.from({ length: 21 }, (_, index) => ({
    x: 0.5,
    y: 0.5 + index * 0.001,
    z: 0,
  }));
  for (const [key, value] of Object.entries(overrides)) {
    points[Number(key)] = { ...points[Number(key)], ...value };
  }
  return points;
}

function hand(partial: Partial<OSBuddyAirControlHand>): OSBuddyAirControlHand {
  return {
    landmarks: partial.landmarks ?? landmarks(),
    handedness: partial.handedness ?? "Right",
    confidence: partial.confidence ?? 0.9,
    gestureName: partial.gestureName ?? null,
    gestureScore: partial.gestureScore ?? 0,
  };
}

describe("OS Buddy Air Control gestures", () => {
  it("maps mirrored normalized points into viewport coordinates", () => {
    expect(
      mapNormalizedPointToViewport({
        point: { x: 0.2, y: 0.25 },
        viewport: { width: 1000, height: 800 },
        mirrored: true,
      }),
    ).toEqual({ x: 800, y: 200 });
  });

  it("detects pinch from thumb/index fingertip distance", () => {
    const testHand = hand({
      landmarks: landmarks({
        0: { x: 0.5, y: 0.8 },
        4: { x: 0.52, y: 0.42 },
        8: { x: 0.525, y: 0.425 },
        9: { x: 0.5, y: 0.55 },
      }),
    });

    expect(isPinching(testHand)).toBe(true);
    expect(resolveAirControlGesture(testHand)).toBe("Pinch");
  });

  it("prefers custom index-point over a missing canned gesture", () => {
    const testHand = hand({
      landmarks: landmarks({
        0: { x: 0.5, y: 0.9 },
        5: { x: 0.5, y: 0.72 },
        6: { x: 0.5, y: 0.56 },
        8: { x: 0.5, y: 0.18 },
        9: { x: 0.54, y: 0.7 },
        10: { x: 0.54, y: 0.64 },
        12: { x: 0.54, y: 0.67 },
        13: { x: 0.58, y: 0.72 },
        14: { x: 0.58, y: 0.66 },
        16: { x: 0.58, y: 0.69 },
        17: { x: 0.62, y: 0.74 },
        18: { x: 0.62, y: 0.68 },
        20: { x: 0.62, y: 0.71 },
      }),
      gestureName: null,
    });

    expect(resolveAirControlGesture(testHand)).toBe("Index_Point");
  });

  it("detects open-palm horizontal swipe", () => {
    const previousHand = hand({
      landmarks: landmarks({
        0: { x: 0.7, y: 0.6 },
        5: { x: 0.72, y: 0.46 },
        9: { x: 0.7, y: 0.43 },
        13: { x: 0.68, y: 0.46 },
        17: { x: 0.66, y: 0.5 },
      }),
    });
    const currentHand = hand({
      landmarks: landmarks({
        0: { x: 0.45, y: 0.6 },
        5: { x: 0.47, y: 0.46 },
        9: { x: 0.45, y: 0.43 },
        13: { x: 0.43, y: 0.46 },
        17: { x: 0.41, y: 0.5 },
      }),
    });
    const previous: OSBuddyAirControlFrame = {
      handCount: 1,
      primaryHand: previousHand,
      now: 1_000,
    };
    const current: OSBuddyAirControlFrame = {
      handCount: 1,
      primaryHand: currentHand,
      now: 1_100,
    };

    expect(detectOpenPalmSwipe({ current, previous, gesture: "Open_Palm" })).toBe(
      "Swipe_Left",
    );
  });
});
