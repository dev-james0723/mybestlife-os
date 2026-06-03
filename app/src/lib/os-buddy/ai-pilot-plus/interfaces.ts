import type {
  OSBuddyAirControlLandmark,
  OSBuddyAirControlPoint,
  OSBuddyAirControlSensorMode,
} from "../os-buddy-air-control-types";
import type {
  AIPilotPlusAction,
  AIPilotPlusPoint,
  AIPilotPlusSurface,
  AIPilotPlusVector,
} from "./types";

export type AIPilotPlusPilotMode =
  | "off"
  | "normal"
  | "plusCountdown"
  | "plusActive"
  | "paused"
  | "error";

export type AIPilotPlusHandedness = "left" | "right" | "unknown";

export type AIPilotPlusFingerName = "thumb" | "index" | "middle" | "ring" | "pinky";

export type AIPilotPlusFingerState = {
  name: AIPilotPlusFingerName;
  extended: boolean;
  tip: OSBuddyAirControlPoint | null;
  joints: OSBuddyAirControlLandmark[];
  confidence: number;
};

export type AIPilotPlusStaticPose =
  | "openPalm"
  | "fist"
  | "indexPoint"
  | "vSign"
  | "pinchIndex"
  | "pinchMiddle"
  | "pinchRing"
  | "pinchPinky"
  | "fingerCount";

export type AIPilotPlusTemporalGesture =
  | "swipeLeft"
  | "swipeRight"
  | "swipeUp"
  | "swipeDown"
  | "circleClockwise"
  | "circleCounterclockwise"
  | "grab"
  | "throw"
  | "catch"
  | "clap"
  | "twoHandSpread"
  | "twoHandPinchIn";

export type AIPilotPlusGestureType =
  | AIPilotPlusStaticPose
  | AIPilotPlusTemporalGesture;

export type AIPilotPlusGestureEvent = {
  id: string;
  timestamp: number;
  type: AIPilotPlusGestureType;
  handedness: AIPilotPlusHandedness;
  handsInvolved: 1 | 2;
  confidence: number;
  durationMs?: number;
  position?: AIPilotPlusPoint;
  velocity?: AIPilotPlusVector;
  metadata?: Record<string, unknown>;
};

export type AIPilotPlusPageContext =
  | "global"
  | "brain"
  | "ideaCapture"
  | "project"
  | "playBall"
  | "popup"
  | "unknown";

export type AIPilotPlusPilotAction =
  | { type: "SCROLL_PAGE"; deltaY: number }
  | { type: "ZOOM_OSBUDDY"; direction: "in" | "out"; amount?: number }
  | { type: "MOVE_OSBUDDY"; x: number; y: number }
  | { type: "CAPTURE_KNOWLEDGE" }
  | { type: "CAPTURE_IDEA" }
  | { type: "ADD_GOAL" }
  | { type: "BRAIN_EXPAND_GRAPH" }
  | { type: "BRAIN_COLLAPSE_GRAPH" }
  | { type: "BRAIN_LINK_NODES" }
  | { type: "IDEA_SEND_TO_INBOX" }
  | { type: "IDEA_PROMOTE_TO_PROJECT" }
  | { type: "IDEA_SAVE_BACKLOG" }
  | { type: "PROJECT_MOVE_NEXT_STATUS" }
  | { type: "PROJECT_MOVE_PREVIOUS_STATUS" }
  | { type: "PROJECT_MARK_DONE" }
  | { type: "PROJECT_BREAK_INTO_SUBTASKS" }
  | { type: "PROJECT_MERGE_RELATED" }
  | { type: "CREATE_SHORTCUT" }
  | { type: "OPEN_COMMAND_PALETTE" }
  | { type: "PLAY_BALL_GRAB" }
  | { type: "PLAY_BALL_THROW"; velocity: AIPilotPlusVector }
  | { type: "PLAY_BALL_CATCH" }
  | { type: "CANCEL" }
  | { type: "CONFIRM" }
  | { type: "NOOP" };

export type AIPilotPlusCountdownState = {
  kind: "inactive" | "plusActivation" | "plusExit";
  startedAt: number | null;
  durationMs: number;
  progress: number;
  label: string | null;
};

export type AIPilotPlusHandSnapshot = {
  id: string;
  handedness: AIPilotPlusHandedness;
  palm: AIPilotPlusPoint | null;
  fingers: Record<AIPilotPlusFingerName, AIPilotPlusFingerState>;
  landmarks: OSBuddyAirControlLandmark[];
  confidence: number;
};

export type AIPilotPlusFrameSnapshot = {
  timestamp: number;
  sensorMode: OSBuddyAirControlSensorMode;
  mode: AIPilotPlusPilotMode;
  hands: AIPilotPlusHandSnapshot[];
  cursor: AIPilotPlusPoint | null;
  pageContext: AIPilotPlusPageContext;
  activeGesture: AIPilotPlusGestureEvent | null;
};

export type AIPilotPlusSettings = {
  enabled: boolean;
  cameraGestureControl: boolean;
  twoHandMode: boolean;
  tenFingerMode: boolean;
  playBallGestureMode: boolean;
  scrollSensitivity: number;
  gestureSensitivity: number;
  smoothingStrength: number;
  plusCountdownMs: number;
  plusExitHoldMs: number;
  reducedMotion: boolean;
  showGestureDebugOverlay: boolean;
  showHandLandmarks: boolean;
  leftHandedMode: boolean;
  oneHandMode: boolean;
};

export type AIPilotPlusActionBinding = {
  id: string;
  pageContext: AIPilotPlusPageContext;
  gesture: AIPilotPlusGestureType;
  mode: AIPilotPlusPilotMode | "any";
  action: AIPilotPlusPilotAction;
  requiresConfirmation?: boolean;
  cooldownMs?: number;
  enabled?: boolean;
};

export type AIPilotPlusFeedbackSnapshot = {
  mode: AIPilotPlusPilotMode;
  countdown: AIPilotPlusCountdownState;
  currentGesture: AIPilotPlusGestureEvent | null;
  currentActionPreview: AIPilotPlusAction | AIPilotPlusPilotAction | null;
  confidence: number;
  showTrail: boolean;
  showLandmarks: boolean;
};

export const AI_PILOT_PLUS_PAGE_CONTEXT_TO_SURFACE: Record<
  AIPilotPlusPageContext,
  AIPilotPlusSurface
> = {
  global: "global",
  brain: "brain",
  ideaCapture: "ideas",
  project: "projects",
  playBall: "play-ball",
  popup: "global",
  unknown: "unknown",
};

export const DEFAULT_AI_PILOT_PLUS_SETTINGS: AIPilotPlusSettings = {
  enabled: true,
  cameraGestureControl: true,
  twoHandMode: true,
  tenFingerMode: false,
  playBallGestureMode: false,
  scrollSensitivity: 1,
  gestureSensitivity: 1,
  smoothingStrength: 0.42,
  plusCountdownMs: 2_000,
  plusExitHoldMs: 1_500,
  reducedMotion: false,
  showGestureDebugOverlay: false,
  showHandLandmarks: false,
  leftHandedMode: false,
  oneHandMode: false,
};

const PAGE_CONTEXTS = new Set<AIPilotPlusPageContext>([
  "global",
  "brain",
  "ideaCapture",
  "project",
  "playBall",
  "popup",
  "unknown",
]);

export function isAIPilotPlusPageContext(
  value: string | null | undefined,
): value is AIPilotPlusPageContext {
  return PAGE_CONTEXTS.has((value ?? "unknown") as AIPilotPlusPageContext);
}

export function normalizeAIPilotPlusPageContext(
  value: string | null | undefined,
): AIPilotPlusPageContext {
  if (!value) return "unknown";
  if (isAIPilotPlusPageContext(value)) return value;

  const normalized = value.toLowerCase();
  if (normalized.includes("brain")) return "brain";
  if (normalized.includes("idea")) return "ideaCapture";
  if (normalized.includes("project")) return "project";
  if (normalized.includes("play") && normalized.includes("ball")) return "playBall";
  if (normalized.includes("modal") || normalized.includes("popup")) return "popup";
  return "unknown";
}

export function createAIPilotPlusGestureEvent(params: {
  id?: string;
  timestamp: number;
  type: AIPilotPlusGestureType;
  handedness?: AIPilotPlusHandedness;
  handsInvolved?: 1 | 2;
  confidence: number;
  durationMs?: number;
  position?: AIPilotPlusPoint;
  velocity?: AIPilotPlusVector;
  metadata?: Record<string, unknown>;
}): AIPilotPlusGestureEvent {
  return {
    id: params.id ?? `${params.type}:${params.timestamp}`,
    timestamp: params.timestamp,
    type: params.type,
    handedness: params.handedness ?? "unknown",
    handsInvolved: params.handsInvolved ?? 1,
    confidence: Math.min(1, Math.max(0, params.confidence)),
    durationMs: params.durationMs,
    position: params.position,
    velocity: params.velocity,
    metadata: params.metadata,
  };
}

export function createAIPilotPlusCountdownState(params: {
  kind: AIPilotPlusCountdownState["kind"];
  now: number;
  startedAt: number | null;
  durationMs: number;
  label: string | null;
}): AIPilotPlusCountdownState {
  if (params.kind === "inactive" || params.startedAt == null || params.durationMs <= 0) {
    return {
      kind: "inactive",
      startedAt: null,
      durationMs: params.durationMs,
      progress: 0,
      label: null,
    };
  }

  return {
    kind: params.kind,
    startedAt: params.startedAt,
    durationMs: params.durationMs,
    progress: Math.min(1, Math.max(0, (params.now - params.startedAt) / params.durationMs)),
    label: params.label,
  };
}
