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

export type OSBuddyAirControlCommand =
  | { type: "follow"; point: OSBuddyAirControlPoint; gesture: OSBuddyAirControlGesture }
  | { type: "pause"; gesture: OSBuddyAirControlGesture }
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
  fps: number;
};
