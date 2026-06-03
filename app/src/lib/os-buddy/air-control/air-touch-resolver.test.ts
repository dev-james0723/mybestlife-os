import { describe, expect, it } from "vitest";
import { resolveAirTouch } from "./air-touch-resolver";
import type { CalibrationData } from "./types";
import type {
  OSBuddyAirControlHand,
  OSBuddyAirControlLandmark,
} from "../os-buddy-air-control-types";

const viewport = { width: 1000, height: 800 };

/** Build a 21-landmark hand. Defaults form an index-pointing pose. */
function pointingHand(over: Partial<OSBuddyAirControlHand> = {}): OSBuddyAirControlHand {
  const lm: OSBuddyAirControlLandmark[] = new Array(21)
    .fill(null)
    .map(() => ({ x: 0.55, y: 0.72, z: 0 }));
  lm[0] = { x: 0.5, y: 0.9, z: 0 }; // wrist
  lm[4] = { x: 0.4, y: 0.75, z: 0 }; // thumb tip (far from index tip)
  lm[5] = { x: 0.5, y: 0.7, z: 0 }; // index mcp
  lm[6] = { x: 0.5, y: 0.55, z: 0 }; // index pip
  lm[7] = { x: 0.5, y: 0.45, z: 0 }; // index dip
  lm[8] = { x: 0.5, y: 0.35, z: 0 }; // index tip (extended, up)
  lm[9] = { x: 0.55, y: 0.7, z: 0 }; // middle mcp
  lm[17] = { x: 0.65, y: 0.7, z: 0 }; // pinky mcp
  return {
    landmarks: lm,
    handedness: "Right",
    confidence: 0.9,
    gestureName: "Pointing_Up",
    gestureScore: 0.9,
    ...over,
  };
}

/** A closed fist: all tips near the wrist -> no finger extended. */
function fistHand(): OSBuddyAirControlHand {
  const lm: OSBuddyAirControlLandmark[] = new Array(21)
    .fill(null)
    .map(() => ({ x: 0.52, y: 0.72, z: 0 }));
  lm[0] = { x: 0.5, y: 0.9, z: 0 };
  lm[4] = { x: 0.45, y: 0.78, z: 0 };
  lm[5] = { x: 0.5, y: 0.7, z: 0 };
  lm[9] = { x: 0.55, y: 0.7, z: 0 };
  lm[17] = { x: 0.62, y: 0.7, z: 0 };
  return {
    landmarks: lm,
    handedness: "Right",
    confidence: 0.9,
    gestureName: "Closed_Fist",
    gestureScore: 0.9,
  };
}

describe("resolveAirTouch", () => {
  it("returns an empty reading with no hand", () => {
    const r = resolveAirTouch({ hand: null, viewport, now: 0 });
    expect(r.fingertip).toBeNull();
    expect(r.isIndexExtended).toBe(false);
    expect(r.gesture).toBe("None");
    expect(r.confidence).toBe(0);
  });

  it("produces a mirrored 2D cursor when the index is extended", () => {
    const r = resolveAirTouch({ hand: pointingHand(), viewport, now: 5 });
    expect(r.isIndexExtended).toBe(true);
    expect(r.mode).toBe("2d");
    expect(r.fingertip).not.toBeNull();
    // tip at x=0.5 mirrored -> (1-0.5)*1000 = 500 ; y=0.35*800 = 280
    expect(r.fingertip!.x).toBeCloseTo(500);
    expect(r.fingertip!.y).toBeCloseTo(280);
    expect(r.confidence).toBeGreaterThan(0);
  });

  it("yields no cursor when the index is not extended (fist)", () => {
    const r = resolveAirTouch({ hand: fistHand(), viewport, now: 0 });
    expect(r.isIndexExtended).toBe(false);
    expect(r.fingertip).toBeNull();
  });

  it("uses the calibrated 3D fingertip only when calibration is usable", () => {
    const goodCal: CalibrationData = {
      createdAt: 0,
      screenCssSize: viewport,
      quality: "good",
      rmsErrorPx: 8,
      mapping: null,
    };
    const r = resolveAirTouch({
      hand: pointingHand(),
      viewport,
      now: 0,
      sensorMode: "stereo",
      calibration: goodCal,
      fingertip3D: { x: 123, y: 456 },
    });
    expect(r.mode).toBe("3d");
    expect(r.fingertip).toEqual({ x: 123, y: 456 });
  });

  it("falls back to 2D when calibration is poor even with a 3D fingertip", () => {
    const poorCal: CalibrationData = {
      createdAt: 0,
      screenCssSize: viewport,
      quality: "poor",
      rmsErrorPx: 90,
      mapping: null,
    };
    const r = resolveAirTouch({
      hand: pointingHand(),
      viewport,
      now: 0,
      calibration: poorCal,
      fingertip3D: { x: 123, y: 456 },
    });
    expect(r.mode).toBe("2d");
  });
});
