import type {
  OSBuddyAirControlFrame,
  OSBuddyAirControlGesture,
  OSBuddyAirControlHand,
  OSBuddyAirControlLandmark,
  OSBuddyAirControlPoint,
} from "./os-buddy-air-control-types";

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

const MIN_HAND_CONFIDENCE = 0.45;
const PINCH_RATIO_THRESHOLD = 0.34;
const INDEX_EXTENSION_RATIO = 1.12;
const OTHER_FINGER_EXTENSION_RATIO = 1.08;
const SWIPE_MIN_VELOCITY = 0.00125;
const SWIPE_MIN_DISTANCE = 0.14;

function landmarkAt(
  landmarks: OSBuddyAirControlLandmark[],
  index: number,
): OSBuddyAirControlLandmark | null {
  return landmarks[index] ?? null;
}

function distance(
  a: OSBuddyAirControlLandmark | null,
  b: OSBuddyAirControlLandmark | null,
) {
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

function isFingerExtended(
  landmarks: OSBuddyAirControlLandmark[],
  tipIndex: number,
  pipIndex: number,
  mcpIndex: number,
  ratio: number,
) {
  const wrist = landmarkAt(landmarks, WRIST);
  const tip = landmarkAt(landmarks, tipIndex);
  const pip = landmarkAt(landmarks, pipIndex);
  const mcp = landmarkAt(landmarks, mcpIndex);
  if (!wrist || !tip || !pip || !mcp) return false;

  const tipDistance = distance(tip, wrist);
  const pipDistance = distance(pip, wrist);
  const mcpDistance = distance(mcp, wrist);
  return tipDistance > Math.max(pipDistance * ratio, mcpDistance * (ratio + 0.18));
}

function getPalmSize(landmarks: OSBuddyAirControlLandmark[]) {
  return Math.max(
    0.001,
    distance(landmarkAt(landmarks, WRIST), landmarkAt(landmarks, MIDDLE_MCP)),
    distance(landmarkAt(landmarks, INDEX_MCP), landmarkAt(landmarks, PINKY_MCP)),
  );
}

function getPalmCenter(landmarks: OSBuddyAirControlLandmark[]): OSBuddyAirControlPoint | null {
  const anchors = [WRIST, INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP]
    .map((index) => landmarkAt(landmarks, index))
    .filter(Boolean) as OSBuddyAirControlLandmark[];
  if (anchors.length === 0) return null;

  return {
    x: anchors.reduce((sum, landmark) => sum + landmark.x, 0) / anchors.length,
    y: anchors.reduce((sum, landmark) => sum + landmark.y, 0) / anchors.length,
  };
}

export function getIndexTipPoint(hand: OSBuddyAirControlHand) {
  const tip = landmarkAt(hand.landmarks, INDEX_TIP);
  if (!tip) return null;
  return { x: tip.x, y: tip.y };
}

export function isPinching(hand: OSBuddyAirControlHand) {
  const thumbTip = landmarkAt(hand.landmarks, THUMB_TIP);
  const indexTip = landmarkAt(hand.landmarks, INDEX_TIP);
  if (!thumbTip || !indexTip) return false;
  return distance(thumbTip, indexTip) / getPalmSize(hand.landmarks) <= PINCH_RATIO_THRESHOLD;
}

export function isIndexPointGesture(hand: OSBuddyAirControlHand) {
  const landmarks = hand.landmarks;
  if (hand.confidence < MIN_HAND_CONFIDENCE || landmarks.length < 21) return false;

  const indexExtended = isFingerExtended(
    landmarks,
    INDEX_TIP,
    INDEX_PIP,
    INDEX_MCP,
    INDEX_EXTENSION_RATIO,
  );
  const middleExtended = isFingerExtended(
    landmarks,
    MIDDLE_TIP,
    MIDDLE_PIP,
    MIDDLE_MCP,
    OTHER_FINGER_EXTENSION_RATIO,
  );
  const ringExtended = isFingerExtended(
    landmarks,
    RING_TIP,
    RING_PIP,
    RING_MCP,
    OTHER_FINGER_EXTENSION_RATIO,
  );
  const pinkyExtended = isFingerExtended(
    landmarks,
    PINKY_TIP,
    PINKY_PIP,
    PINKY_MCP,
    OTHER_FINGER_EXTENSION_RATIO,
  );

  return indexExtended && !middleExtended && !ringExtended && !pinkyExtended;
}

export function selectPrimaryAirControlHand(hands: OSBuddyAirControlHand[]) {
  return hands.reduce<OSBuddyAirControlHand | null>((best, hand) => {
    if (!best) return hand;
    const score = hand.confidence + hand.gestureScore * 0.35;
    const bestScore = best.confidence + best.gestureScore * 0.35;
    return score > bestScore ? hand : best;
  }, null);
}

export function mapNormalizedPointToViewport(params: {
  point: OSBuddyAirControlPoint;
  viewport: { width: number; height: number };
  mirrored?: boolean;
}) {
  return {
    x: (params.mirrored ? 1 - params.point.x : params.point.x) * params.viewport.width,
    y: params.point.y * params.viewport.height,
  };
}

export function normalizeMediaPipeGesture(name: string | null): OSBuddyAirControlGesture {
  switch (name) {
    case "Closed_Fist":
    case "Open_Palm":
    case "Pointing_Up":
    case "Thumb_Up":
    case "Thumb_Down":
    case "Victory":
    case "ILoveYou":
      return name;
    default:
      return "None";
  }
}

export function resolveAirControlGesture(hand: OSBuddyAirControlHand | null) {
  if (!hand || hand.confidence < MIN_HAND_CONFIDENCE) return "None";
  if (isPinching(hand)) return "Pinch";
  if (isIndexPointGesture(hand)) return "Index_Point";
  return normalizeMediaPipeGesture(hand.gestureName);
}

export function detectOpenPalmSwipe(params: {
  current: OSBuddyAirControlFrame;
  previous: OSBuddyAirControlFrame | null;
  gesture: OSBuddyAirControlGesture;
}) {
  if (params.gesture !== "Open_Palm" || !params.current.primaryHand || !params.previous?.primaryHand) {
    return null;
  }

  const currentCenter = getPalmCenter(params.current.primaryHand.landmarks);
  const previousCenter = getPalmCenter(params.previous.primaryHand.landmarks);
  if (!currentCenter || !previousCenter) return null;

  const elapsed = Math.max(1, params.current.now - params.previous.now);
  const dx = currentCenter.x - previousCenter.x;
  const velocityX = dx / elapsed;
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(velocityX) < SWIPE_MIN_VELOCITY) {
    return null;
  }

  return dx < 0 ? "Swipe_Left" : "Swipe_Right";
}
