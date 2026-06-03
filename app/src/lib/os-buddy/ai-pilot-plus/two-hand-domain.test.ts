import { describe, expect, it } from "vitest";
import type {
  OSBuddyAirControlHand,
  OSBuddyAirControlLandmark,
} from "../os-buddy-air-control-types";
import {
  createAIPilotPlusGestureEvent,
} from "./interfaces";
import {
  createAIPilotPlusGestureEventFromAirControl,
  createAIPilotPlusTwoHandState,
  resolveAIPilotPlusLeftHandDomain,
  stepAIPilotPlusTwoHandController,
} from "./two-hand-domain";

function hand(extended: "thumb" | "index" | "middle" | "ring" | "pinky" | "none", gestureName: string | null = null): OSBuddyAirControlHand {
  const landmarks: OSBuddyAirControlLandmark[] = new Array(21)
    .fill(null)
    .map(() => ({ x: 0, y: 0, z: 0 }));
  landmarks[0] = { x: 0, y: 0, z: 0 };
  landmarks[4] = extended === "thumb" ? { x: 1.5, y: 0, z: 0 } : { x: 0.2, y: 0, z: 0 };
  landmarks[5] = { x: 0.4, y: 0, z: 0 };
  landmarks[6] = { x: 0.45, y: 0, z: 0 };
  landmarks[8] = extended === "index" ? { x: 1.2, y: 0, z: 0 } : { x: 0.46, y: 0, z: 0 };
  landmarks[9] = { x: 0.5, y: 0, z: 0 };
  landmarks[10] = { x: 0.55, y: 0, z: 0 };
  landmarks[12] = extended === "middle" ? { x: 1.25, y: 0, z: 0 } : { x: 0.56, y: 0, z: 0 };
  landmarks[13] = { x: 0.6, y: 0, z: 0 };
  landmarks[14] = { x: 0.65, y: 0, z: 0 };
  landmarks[16] = extended === "ring" ? { x: 1.3, y: 0, z: 0 } : { x: 0.66, y: 0, z: 0 };
  landmarks[17] = { x: 0.7, y: 0, z: 0 };
  landmarks[18] = { x: 0.75, y: 0, z: 0 };
  landmarks[20] = extended === "pinky" ? { x: 1.35, y: 0, z: 0 } : { x: 0.76, y: 0, z: 0 };

  return {
    landmarks,
    handedness: "Left",
    confidence: 0.9,
    gestureName,
    gestureScore: 0.9,
  };
}

describe("AI Pilot Plus two-hand domain controller", () => {
  it("maps left-hand fingers to domains", () => {
    expect(resolveAIPilotPlusLeftHandDomain(hand("thumb"))).toBe("osBuddy");
    expect(resolveAIPilotPlusLeftHandDomain(hand("index"))).toBe("brain");
    expect(resolveAIPilotPlusLeftHandDomain(hand("middle"))).toBe("ideas");
    expect(resolveAIPilotPlusLeftHandDomain(hand("ring"))).toBe("projects");
    expect(resolveAIPilotPlusLeftHandDomain(hand("pinky"))).toBe("shortcuts");
  });

  it("uses the right-hand gesture to preview a domain action", () => {
    const result = stepAIPilotPlusTwoHandController({
      previous: createAIPilotPlusTwoHandState(),
      mode: "plusActive",
      enabled: true,
      leftHand: hand("index"),
      rightGestureEvent: createAIPilotPlusGestureEvent({
        timestamp: 1_000,
        type: "pinchMiddle",
        confidence: 0.9,
      }),
    });

    expect(result.next.domain).toBe("brain");
    expect(result.action).toEqual({ type: "CAPTURE_KNOWLEDGE" });
    expect(result.next.previewLabel).toContain("brain");
  });

  it("does not run outside Plus mode", () => {
    const result = stepAIPilotPlusTwoHandController({
      previous: createAIPilotPlusTwoHandState(),
      mode: "normal",
      enabled: true,
      leftHand: hand("index"),
      rightGestureEvent: createAIPilotPlusGestureEvent({
        timestamp: 1_000,
        type: "pinchMiddle",
        confidence: 0.9,
      }),
    });

    expect(result.next.domain).toBeNull();
    expect(result.action).toBeNull();
  });

  it("maps AirPilot gestures into Plus gesture events", () => {
    expect(createAIPilotPlusGestureEventFromAirControl({
      gesture: "Pinch",
      timestamp: 1_000,
      confidence: 0.9,
    })?.type).toBe("pinchIndex");
    expect(createAIPilotPlusGestureEventFromAirControl({
      gesture: "Swipe_Right",
      timestamp: 1_000,
      confidence: 0.9,
    })?.type).toBe("swipeRight");
  });
});
