/**
 * Layer 2 — Air Touch resolver (PURE).
 *
 * Turns a primary hand (+ viewport, optional calibration & 3D fingertip) into an
 * {@link AirTouchReading}: where the virtual cursor is on screen, whether the index
 * is extended, the gesture, a confidence, and an HONEST `mode`:
 *   - "2d": image-space index tip mapped to the viewport (single RGB, no depth)
 *   - "3d": projected from a calibrated screen plane + a usable 3D fingertip
 *
 * The interaction (grab on dwell) never changes between modes; 3D only improves
 * the accuracy of the fingertip's screen position.
 */

import { isUsableCalibration } from "./calibration";
import {
  getIndexTipPoint,
  isIndexExtendedForCursor,
  mapNormalizedPointToViewport,
  resolveAirControlGesture,
} from "./gestures";
import { confidenceScore, type Vec2, type Vec3 } from "./geometry";
import type { AirTouchReading, CalibrationData } from "./types";
import type {
  OSBuddyAirControlHand,
  OSBuddyAirControlSensorMode,
} from "../os-buddy-air-control-types";

export type ResolveAirTouchInput = {
  hand: OSBuddyAirControlHand | null;
  viewport: { width: number; height: number };
  now: number;
  sensorMode?: OSBuddyAirControlSensorMode;
  calibration?: CalibrationData | null;
  /** Screen-space fingertip from a calibrated 3D source, if available. */
  fingertip3D?: Vec2 | null;
  /** Raw world fingertip (reserved for ray pipeline); currently advisory only. */
  worldFingertip?: Vec3 | null;
  /** Whether the camera image is mirrored (front camera). Defaults to true. */
  mirrored?: boolean;
};

const EMPTY_READING = (
  timestamp: number,
  sensorMode: OSBuddyAirControlSensorMode,
): AirTouchReading => ({
  timestamp,
  fingertip: null,
  isIndexExtended: false,
  gesture: "None",
  confidence: 0,
  mode: "2d",
  sensorMode,
});

export function resolveAirTouch(input: ResolveAirTouchInput): AirTouchReading {
  const sensorMode = input.sensorMode ?? "rgb-webcam";
  const { hand, viewport, now } = input;

  if (!hand || viewport.width <= 0 || viewport.height <= 0) {
    return EMPTY_READING(now, sensorMode);
  }

  const gesture = resolveAirControlGesture(hand);
  const isIndexExtended = isIndexExtendedForCursor(hand, gesture);

  // True-3D path: only when calibration is usable AND a 3D fingertip is supplied.
  const useCalibrated3D =
    isUsableCalibration(input.calibration ?? null) && input.fingertip3D != null;

  if (useCalibrated3D && input.fingertip3D) {
    return {
      timestamp: now,
      fingertip: isIndexExtended ? input.fingertip3D : null,
      isIndexExtended,
      gesture,
      confidence: confidenceScore([hand.confidence, 0.9]),
      mode: "3d",
      sensorMode,
    };
  }

  // 2D fallback: map the image-space index tip into the viewport.
  const tip = getIndexTipPoint(hand);
  const fingertip: Vec2 | null =
    tip && isIndexExtended
      ? mapNormalizedPointToViewport({
          point: tip,
          viewport,
          mirrored: input.mirrored ?? true,
        })
      : null;

  return {
    timestamp: now,
    fingertip,
    isIndexExtended,
    gesture,
    confidence: confidenceScore([hand.confidence, 0.75]),
    mode: "2d",
    sensorMode,
  };
}
