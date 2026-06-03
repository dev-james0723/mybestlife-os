export type OSBuddyAirControlStatus =
  | "idle"
  | "requesting-permission"
  | "loading-model"
  | "tracking"
  | "paused"
  | "error";

export type OSBuddyAirControlStopReason =
  | "user-exit"
  | "closed-fist"
  | "permission-denied"
  | "unsupported"
  | "camera-error"
  | "model-error"
  | "visibility-hidden"
  | "route-change"
  | "buddy-hidden"
  | "unmount";

export type OSBuddyAirControlGesture =
  | "Index_Point"
  | "Open_Palm"
  | "Closed_Fist"
  | "Pinch"
  | "Victory"
  | "Thumb_Up"
  | "Thumb_Down"
  | "Pointing_Up"
  | "ILoveYou"
  | "Swipe_Left"
  | "Swipe_Right"
  | "None";

/**
 * Which sensor is currently producing the fingertip position. Only the calibrated
 * 3D sources (stereo/depth/phone-ar) may ever be labelled "3D" in the UI; a single
 * RGB webcam without calibration is honest "2D fallback".
 */
export type OSBuddyAirControlSensorMode =
  | "rgb-webcam"
  | "phone-rgb"
  | "phone-ar"
  | "stereo"
  | "depth"
  | "fallback-2d";

/** Calibration quality tier. "uncalibrated" forbids any "3D" labelling. */
export type OSBuddyAirControlQuality = "uncalibrated" | "poor" | "ok" | "good";

/** Air Touch interaction states (the grab state machine). */
export type OSBuddyAirTouchState =
  | "inactive"
  | "tracking"
  | "hovering"
  | "grabbed"
  | "dragging"
  | "released";

export type OSBuddyAirControlPoint = {
  x: number;
  y: number;
};

export type OSBuddyAirControlLandmark = {
  x: number;
  y: number;
  z?: number;
};

export type OSBuddyAirControlHand = {
  landmarks: OSBuddyAirControlLandmark[];
  handedness: "Left" | "Right" | "Unknown";
  confidence: number;
  gestureName: string | null;
  gestureScore: number;
};

export type OSBuddyAirControlFrame = {
  handCount: number;
  primaryHand: OSBuddyAirControlHand | null;
  now: number;
};

/**
 * Air Touch / Air Grab command union (replaces the old "follow the pointer" model).
 *
 * The fingertip is a virtual touch cursor. OSBuddy only moves once the cursor
 * enters its hitbox and dwells (grab), then follows by a fixed grab offset (drag).
 * Release happens ONLY on open palm. Hand-lost / low confidence FREEZES in place
 * (pause) rather than dropping the buddy.
 */
export type OSBuddyAirControlCommand =
  // Virtual cursor position + lifecycle (no dock movement).
  | {
      type: "cursor";
      point: OSBuddyAirControlPoint;
      state: OSBuddyAirTouchState;
      confidence: number;
    }
  // Cursor entered the hitbox, dwell started (no dock movement yet).
  | { type: "hover"; point: OSBuddyAirControlPoint }
  // Dwell satisfied: OSBuddy is grabbed at `grabOffset` from the cursor.
  | { type: "grab"; point: OSBuddyAirControlPoint; grabOffset: OSBuddyAirControlPoint }
  // While grabbed: dock target = point - grabOffset (caller clamps to viewport).
  | { type: "drag"; point: OSBuddyAirControlPoint }
  // Open palm released the buddy; `save` persists the resting position.
  | { type: "release"; point?: OSBuddyAirControlPoint; save: boolean }
  // Hand lost / low confidence: freeze in place, keep the grab.
  | { type: "pause"; reason: "hand-lost" | "low-confidence" }
  // Hand re-acquired within hysteresis: resume dragging.
  | { type: "resume" }
  // Full exit of Air Control (quad-tap / Escape / closed-fist hold).
  | { type: "exit"; gesture: OSBuddyAirControlGesture }
  // Pinch: context click / interact.
  | { type: "select"; gesture: OSBuddyAirControlGesture }
  // Victory: start play-ball.
  | { type: "play-ball"; gesture: OSBuddyAirControlGesture }
  // Thumb up: celebrate / confirm.
  | { type: "celebrate"; gesture: OSBuddyAirControlGesture }
  // Hand has been absent long enough to surface a "lost hand" hint.
  | { type: "lost-hand" };

export type OSBuddyAirControlDebugState = {
  handCount: number;
  gesture: OSBuddyAirControlGesture | null;
  confidence: number;
  /** Current dock target (legacy field kept for the debug panel). */
  target: OSBuddyAirControlPoint | null;
  /** Raw virtual-cursor (fingertip) screen position. */
  fingertip: OSBuddyAirControlPoint | null;
  state: OSBuddyAirTouchState;
  hitbox: { x: number; y: number; width: number; height: number } | null;
  sensorMode: OSBuddyAirControlSensorMode;
  quality: OSBuddyAirControlQuality;
  latencyMs: number;
  fps: number;
};
