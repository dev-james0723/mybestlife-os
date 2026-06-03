import type {
  OSBuddyAirControlGesture,
  OSBuddyAirControlHand,
  OSBuddyAirControlLandmark,
} from "../os-buddy-air-control-types";
import {
  createAIPilotPlusGestureEvent,
  type AIPilotPlusGestureEvent,
  type AIPilotPlusGestureType,
  type AIPilotPlusPilotAction,
  type AIPilotPlusPilotMode,
} from "./interfaces";

export type AIPilotPlusDomain =
  | "global"
  | "osBuddy"
  | "brain"
  | "ideas"
  | "projects"
  | "shortcuts";

export type AIPilotPlusTwoHandState = {
  domain: AIPilotPlusDomain | null;
  lockedDomain: AIPilotPlusDomain | null;
  actionPreview: AIPilotPlusPilotAction | null;
  previewLabel: string | null;
};

export type AIPilotPlusTwoHandResult = {
  next: AIPilotPlusTwoHandState;
  action: AIPilotPlusPilotAction | null;
};

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

function landmark(
  hand: OSBuddyAirControlHand | null | undefined,
  index: number,
): OSBuddyAirControlLandmark | null {
  return hand?.landmarks[index] ?? null;
}

function distance(
  a: OSBuddyAirControlLandmark | null,
  b: OSBuddyAirControlLandmark | null,
): number {
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function isExtended(params: {
  hand: OSBuddyAirControlHand;
  tip: number;
  pip: number;
  mcp: number;
}) {
  const wrist = landmark(params.hand, WRIST);
  const tip = landmark(params.hand, params.tip);
  const pip = landmark(params.hand, params.pip);
  const mcp = landmark(params.hand, params.mcp);
  if (!wrist || !tip || !pip || !mcp) return false;

  return distance(tip, wrist) > Math.max(distance(pip, wrist) * 1.08, distance(mcp, wrist) * 1.22);
}

function isThumbExtended(hand: OSBuddyAirControlHand) {
  const wrist = landmark(hand, WRIST);
  const thumb = landmark(hand, THUMB_TIP);
  const indexMcp = landmark(hand, INDEX_MCP);
  if (!wrist || !thumb || !indexMcp) return false;
  return distance(thumb, wrist) > distance(indexMcp, wrist) * 1.22;
}

export function createAIPilotPlusTwoHandState(): AIPilotPlusTwoHandState {
  return {
    domain: null,
    lockedDomain: null,
    actionPreview: null,
    previewLabel: null,
  };
}

export function resolveAIPilotPlusLeftHandDomain(
  leftHand: OSBuddyAirControlHand | null,
  previousLockedDomain: AIPilotPlusDomain | null = null,
): AIPilotPlusDomain | null {
  if (!leftHand || leftHand.confidence < 0.65 || leftHand.landmarks.length < 21) {
    return previousLockedDomain;
  }

  if (leftHand.gestureName === "Open_Palm") return "global";
  if (leftHand.gestureName === "Closed_Fist") return previousLockedDomain;

  const domains: Array<[AIPilotPlusDomain, boolean]> = [
    ["osBuddy", isThumbExtended(leftHand)],
    [
      "brain",
      isExtended({ hand: leftHand, tip: INDEX_TIP, pip: INDEX_PIP, mcp: INDEX_MCP }),
    ],
    [
      "ideas",
      isExtended({ hand: leftHand, tip: MIDDLE_TIP, pip: MIDDLE_PIP, mcp: MIDDLE_MCP }),
    ],
    [
      "projects",
      isExtended({ hand: leftHand, tip: RING_TIP, pip: RING_PIP, mcp: RING_MCP }),
    ],
    [
      "shortcuts",
      isExtended({ hand: leftHand, tip: PINKY_TIP, pip: PINKY_PIP, mcp: PINKY_MCP }),
    ],
  ];
  const active = domains.filter(([, extended]) => extended).map(([domain]) => domain);

  return active.length === 1 ? active[0] : previousLockedDomain;
}

export function mapAirControlGestureToAIPilotPlusGestureType(
  gesture: OSBuddyAirControlGesture,
): AIPilotPlusGestureType | null {
  switch (gesture) {
    case "Open_Palm":
      return "openPalm";
    case "Closed_Fist":
      return "fist";
    case "Index_Point":
    case "Pointing_Up":
      return "indexPoint";
    case "Victory":
      return "vSign";
    case "Pinch":
      return "pinchIndex";
    case "Swipe_Left":
      return "swipeLeft";
    case "Swipe_Right":
      return "swipeRight";
    default:
      return null;
  }
}

function actionForDomain(
  domain: AIPilotPlusDomain,
  event: AIPilotPlusGestureEvent,
): AIPilotPlusPilotAction | null {
  if (event.type === "openPalm") return { type: "CANCEL" };
  if (event.type === "pinchIndex") return { type: "CONFIRM" };

  if (event.type === "throw") {
    if (domain === "brain") return { type: "CAPTURE_KNOWLEDGE" };
    if (domain === "ideas") return { type: "CAPTURE_IDEA" };
    if (domain === "projects") return { type: "PROJECT_MOVE_NEXT_STATUS" };
    if (domain === "shortcuts") return { type: "CREATE_SHORTCUT" };
  }

  if (domain === "brain" && event.type === "pinchMiddle") return { type: "CAPTURE_KNOWLEDGE" };
  if (domain === "ideas" && event.type === "pinchMiddle") return { type: "CAPTURE_IDEA" };
  if (domain === "projects" && event.type === "pinchRing") return { type: "ADD_GOAL" };
  if (domain === "shortcuts" && event.type === "pinchPinky") return { type: "CREATE_SHORTCUT" };
  if (domain === "osBuddy" && event.type === "circleClockwise") {
    return { type: "ZOOM_OSBUDDY", direction: "in", amount: 0.16 };
  }
  if (domain === "osBuddy" && event.type === "circleCounterclockwise") {
    return { type: "ZOOM_OSBUDDY", direction: "out", amount: 0.16 };
  }

  return null;
}

function labelForDomain(domain: AIPilotPlusDomain | null, action: AIPilotPlusPilotAction | null) {
  if (!domain) return null;
  if (!action) return `${domain}`;
  return `${domain}: ${action.type.toLowerCase().replaceAll("_", " ")}`;
}

export function stepAIPilotPlusTwoHandController(params: {
  previous: AIPilotPlusTwoHandState;
  mode: AIPilotPlusPilotMode;
  leftHand: OSBuddyAirControlHand | null;
  rightGestureEvent: AIPilotPlusGestureEvent | null;
  enabled: boolean;
}): AIPilotPlusTwoHandResult {
  if (!params.enabled || params.mode !== "plusActive") {
    return {
      next: createAIPilotPlusTwoHandState(),
      action: null,
    };
  }

  const domain = resolveAIPilotPlusLeftHandDomain(
    params.leftHand,
    params.previous.lockedDomain,
  );
  const lockedDomain =
    params.leftHand?.gestureName === "Closed_Fist"
      ? params.previous.domain ?? params.previous.lockedDomain
      : params.previous.lockedDomain;
  const effectiveDomain = lockedDomain ?? domain;
  const action =
    effectiveDomain && params.rightGestureEvent
      ? actionForDomain(effectiveDomain, params.rightGestureEvent)
      : null;

  return {
    next: {
      domain: effectiveDomain,
      lockedDomain,
      actionPreview: action,
      previewLabel: labelForDomain(effectiveDomain, action),
    },
    action,
  };
}

export function createAIPilotPlusGestureEventFromAirControl(params: {
  gesture: OSBuddyAirControlGesture;
  timestamp: number;
  confidence: number;
}): AIPilotPlusGestureEvent | null {
  const type = mapAirControlGestureToAIPilotPlusGestureType(params.gesture);
  if (!type) return null;
  return createAIPilotPlusGestureEvent({
    timestamp: params.timestamp,
    type,
    confidence: params.confidence,
    handedness: "right",
  });
}
