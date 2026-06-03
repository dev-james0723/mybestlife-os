export type OSBuddyAirControlStatus =
  | "idle"
  | "wake-listening"
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
  | "OK_Open"
  | "Swipe_Left"
  | "Swipe_Right"
  | "None";

export type OSBuddyAirControlSensorMode =
  | "rgb-webcam"
  | "phone-rgb"
  | "phone-ar"
  | "stereo"
  | "depth"
  | "fallback-2d";

export type OSBuddyAirControlQuality = "uncalibrated" | "poor" | "ok" | "good";

export type OSBuddyAirTouchState =
  | "inactive"
  | "tracking"
  | "hovering"
  | "grabbed"
  | "dragging"
  | "released";

export type OSBuddyAirPilotPinchState =
  | "tracking"
  | "prepared"
  | "pinching"
  | "cooldown";

export type OSBuddyAirPilotSelectState =
  | "tracking"
  | "candidate"
  | "locked"
  | "armed"
  | "tapping"
  | "cooldown";

export type OSBuddyAirPilotMagnetPhase = "tracking" | "candidate" | "locked";

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
  worldLandmarks?: OSBuddyAirControlLandmark[];
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

export type OSBuddyAirControlCommand =
  | {
      type: "cursor";
      point: OSBuddyAirControlPoint;
      state: OSBuddyAirTouchState;
      confidence: number;
    }
  | { type: "hover"; point: OSBuddyAirControlPoint }
  | { type: "grab"; point: OSBuddyAirControlPoint; grabOffset: OSBuddyAirControlPoint }
  | { type: "drag"; point: OSBuddyAirControlPoint }
  | { type: "release"; point?: OSBuddyAirControlPoint; save: boolean }
  | { type: "wake"; gesture: OSBuddyAirControlGesture; point: OSBuddyAirControlPoint | null }
  | { type: "follow"; point: OSBuddyAirControlPoint; gesture: OSBuddyAirControlGesture }
  | {
      type: "page-cursor";
      point: OSBuddyAirControlPoint;
      gesture: OSBuddyAirControlGesture;
      selectState: OSBuddyAirPilotSelectState;
    }
  | {
      type: "page-select";
      point: OSBuddyAirControlPoint;
      gesture: OSBuddyAirControlGesture;
      selectState: OSBuddyAirPilotSelectState;
    }
  | {
      type: "page-scroll";
      point: OSBuddyAirControlPoint;
      deltaY: number;
      gesture: OSBuddyAirControlGesture;
    }
  | {
      type: "pause";
      reason?: "hand-lost" | "low-confidence";
      gesture?: OSBuddyAirControlGesture;
    }
  | { type: "resume" }
  | { type: "hold"; gesture: OSBuddyAirControlGesture }
  | { type: "exit"; gesture: OSBuddyAirControlGesture }
  | { type: "select"; gesture: OSBuddyAirControlGesture }
  | { type: "play-ball"; gesture: OSBuddyAirControlGesture }
  | { type: "celebrate"; gesture: OSBuddyAirControlGesture }
  | { type: "dash-left"; gesture: OSBuddyAirControlGesture }
  | { type: "dash-right"; gesture: OSBuddyAirControlGesture }
  | { type: "lost-hand" };

export type OSBuddyAirControlDebugState = {
  handCount: number;
  gesture: OSBuddyAirControlGesture | null;
  confidence: number;
  target: OSBuddyAirControlPoint | null;
  fingertip: OSBuddyAirControlPoint | null;
  state: OSBuddyAirTouchState;
  hitbox: { x: number; y: number; width: number; height: number } | null;
  sensorMode: OSBuddyAirControlSensorMode;
  quality: OSBuddyAirControlQuality;
  latencyMs: number;
  selectState: OSBuddyAirPilotSelectState;
  indexTapScore: number | null;
  magnetPhase: OSBuddyAirPilotMagnetPhase;
  magnetTargetLabel?: string;
  rawCursor: OSBuddyAirControlPoint | null;
  landmarks: OSBuddyAirControlLandmark[];
  fps: number;
};
