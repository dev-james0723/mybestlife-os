/**
 * Gesture helpers for Air Touch. Re-exports the existing landmark gesture logic
 * and adds the two checks the grab machine needs: a cursor requires an extended
 * index finger, and release requires an open palm.
 */

import {
  getIndexTipPoint,
  isIndexPointGesture,
  isPinching,
  mapNormalizedPointToViewport,
  normalizeMediaPipeGesture,
  resolveAirControlGesture,
  selectPrimaryAirControlHand,
} from "../os-buddy-air-gestures";
import type {
  OSBuddyAirControlGesture,
  OSBuddyAirControlHand,
} from "../os-buddy-air-control-types";

export {
  getIndexTipPoint,
  isIndexPointGesture,
  isPinching,
  mapNormalizedPointToViewport,
  normalizeMediaPipeGesture,
  resolveAirControlGesture,
  selectPrimaryAirControlHand,
};

/**
 * Whether the hand should produce a virtual cursor. The index must be extended
 * (pointing or pinch-ready). We accept Index_Point / Pointing_Up / Pinch — all of
 * which keep the index tip meaningful — and reject closed fists / open palms.
 */
export function isIndexExtendedForCursor(
  hand: OSBuddyAirControlHand | null,
  gesture: OSBuddyAirControlGesture,
): boolean {
  if (!hand) return false;
  if (gesture === "Index_Point" || gesture === "Pointing_Up" || gesture === "Pinch") {
    return true;
  }
  // Fall back to the geometric index-point test for gestures the recognizer
  // labels generically but where the index is clearly extended.
  return isIndexPointGesture(hand);
}

/** Whether the resolved gesture is an open palm (the only Air Touch release). */
export function isOpenPalm(gesture: OSBuddyAirControlGesture): boolean {
  return gesture === "Open_Palm";
}
