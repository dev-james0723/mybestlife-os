/**
 * Layer 3 — Air Touch / Air Grab state machine (PURE).
 *
 * The fingertip is a virtual touch cursor. OSBuddy does NOT move until the cursor
 * enters its (padded) hitbox and dwells ~200ms — then it is GRABBED and follows
 * the cursor by a fixed grab offset (so it never jumps to centre). Release happens
 * ONLY on an open palm. If the hand is lost or confidence drops, the buddy FREEZES
 * in place (pause) and resumes if the hand returns within the hysteresis window —
 * it is never dropped on tracking loss.
 *
 * Pure and deterministic: no React, DOM, or MediaPipe. `now` and all timing are
 * passed in, which makes the dwell / hysteresis behaviour fully unit-testable.
 */

import { lowPass } from "./filters";
import { distance2, pointInHitbox, type Hitbox, type Vec2 } from "./geometry";
import type { AirTouchReading } from "./types";
import type { OSBuddyAirControlCommand, OSBuddyAirTouchState } from "../os-buddy-air-control-types";

export type AirGrabConfig = {
  /** Padding added around OSBuddy's box so jitter doesn't make it hard to touch. */
  hitboxPadding: number;
  /** Continuous time the cursor must dwell inside the hitbox before grabbing. */
  dwellMs: number;
  /** How long a grabbed buddy stays frozen-but-held after the hand is lost. */
  releaseHysteresisMs: number;
  /** Smoothing alpha while tracking/hovering (stable). */
  hoverAlpha: number;
  /** Smoothing alpha while grabbed/dragging (responsive). */
  grabAlpha: number;
  /** Minimum reading confidence to act on the cursor. */
  confidenceFloor: number;
  /** Confidence at/above which a release saves the resting position. */
  saveConfidence: number;
  /** Minimum cursor movement (px) to count as a drag. */
  dragEpsilonPx: number;
};

export const DEFAULT_AIR_GRAB_CONFIG: AirGrabConfig = {
  hitboxPadding: 36,
  dwellMs: 200,
  releaseHysteresisMs: 300,
  hoverAlpha: 0.18,
  grabAlpha: 0.35,
  confidenceFloor: 0.5,
  saveConfidence: 0.6,
  dragEpsilonPx: 0.5,
};

export type AirGrabState = {
  state: OSBuddyAirTouchState;
  grabOffset: Vec2 | null;
  hoverSince: number | null;
  lostSince: number | null;
  smoothed: Vec2 | null;
};

export function createAirGrabState(): AirGrabState {
  return {
    state: "inactive",
    grabOffset: null,
    hoverSince: null,
    lostSince: null,
    smoothed: null,
  };
}

export type StepAirGrabInput = {
  reading: AirTouchReading;
  hitbox: Hitbox;
  dockPoint: Vec2;
  now: number;
  config?: AirGrabConfig;
};

export type StepAirGrabResult = {
  next: AirGrabState;
  commands: OSBuddyAirControlCommand[];
};

function isGrabbingState(state: OSBuddyAirTouchState): boolean {
  return state === "grabbed" || state === "dragging";
}

export function stepAirGrab(prev: AirGrabState, input: StepAirGrabInput): StepAirGrabResult {
  const cfg = input.config ?? DEFAULT_AIR_GRAB_CONFIG;
  const { reading, hitbox, dockPoint, now } = input;
  const commands: OSBuddyAirControlCommand[] = [];

  const next: AirGrabState = { ...prev };
  if (next.state === "inactive") next.state = "tracking";

  const wasGrabbing = isGrabbingState(prev.state);

  // 1) Release: open palm while holding (works even though an open palm has no
  //    usable cursor — release is intentional regardless of fingertip presence).
  if (wasGrabbing && reading.gesture === "Open_Palm") {
    const save = reading.confidence >= cfg.saveConfidence;
    next.state = "tracking";
    next.grabOffset = null;
    next.hoverSince = null;
    next.lostSince = null;
    commands.push({
      type: "release",
      point: prev.smoothed ?? undefined,
      save,
    });
    return { next, commands };
  }

  const usable =
    reading.fingertip != null &&
    reading.isIndexExtended &&
    reading.confidence >= cfg.confidenceFloor;

  // 2) Unusable frame (hand lost / not extended / low confidence).
  if (!usable || !reading.fingertip) {
    if (wasGrabbing) {
      // Freeze in place, keep the grab. Emit pause once on loss.
      if (prev.lostSince == null) {
        next.lostSince = now;
        commands.push({
          type: "pause",
          reason: reading.fingertip == null ? "hand-lost" : "low-confidence",
        });
      }
      next.state = "grabbed";
      return { next, commands };
    }
    // Not holding: drop back to tracking, hide the cursor.
    next.state = "tracking";
    next.hoverSince = null;
    return { next, commands };
  }

  // 3) Usable frame. Resume from a frozen grab if needed.
  if (wasGrabbing && prev.lostSince != null) {
    commands.push({ type: "resume" });
  }
  next.lostSince = null;

  const alpha = wasGrabbing ? cfg.grabAlpha : cfg.hoverAlpha;
  const smoothed = lowPass(prev.smoothed, reading.fingertip, alpha);
  next.smoothed = smoothed;

  const inHitbox = pointInHitbox(smoothed, hitbox, cfg.hitboxPadding);
  const baseState: OSBuddyAirTouchState =
    prev.state === "inactive" ? "tracking" : prev.state;

  switch (baseState) {
    case "tracking":
    case "released": {
      if (inHitbox) {
        next.state = "hovering";
        next.hoverSince = now;
        commands.push({ type: "hover", point: smoothed });
      } else {
        next.state = "tracking";
        next.hoverSince = null;
      }
      break;
    }
    case "hovering": {
      if (!inHitbox) {
        next.state = "tracking";
        next.hoverSince = null;
      } else if (prev.hoverSince != null && now - prev.hoverSince >= cfg.dwellMs) {
        next.state = "grabbed";
        next.grabOffset = { x: smoothed.x - dockPoint.x, y: smoothed.y - dockPoint.y };
        commands.push({ type: "grab", point: smoothed, grabOffset: next.grabOffset });
      } else {
        next.state = "hovering"; // keep dwelling (hoverSince preserved)
      }
      break;
    }
    case "grabbed":
    case "dragging": {
      const moved = prev.smoothed ? distance2(prev.smoothed, smoothed) > cfg.dragEpsilonPx : true;
      if (moved) {
        next.state = "dragging";
        commands.push({ type: "drag", point: smoothed });
      } else {
        next.state = prev.state;
      }
      break;
    }
    default:
      break;
  }

  // Always surface the cursor for the overlay (with the resolved state).
  commands.unshift({
    type: "cursor",
    point: smoothed,
    state: next.state,
    confidence: reading.confidence,
  });

  return { next, commands };
}
