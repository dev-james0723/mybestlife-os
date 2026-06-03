import type {
  OSBuddyAirControlHand,
  OSBuddyAirControlLandmark,
  OSBuddyAirControlPoint,
  OSBuddyAirPilotPinchState,
} from "./os-buddy-air-control-types";

export const OS_BUDDY_HAND_LANDMARK_COUNT = 21;

export const OS_BUDDY_HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
] as const;

export const AIRPILOT_OPEN_RATIO_THRESHOLD = 0.52;
export const AIRPILOT_PINCH_RATIO_THRESHOLD = 0.34;
export const AIRPILOT_OPEN_HOLD_MS = 120;
export const AIRPILOT_PINCH_HOLD_MS = 110;
export const AIRPILOT_SELECTION_COOLDOWN_MS = 600;
export const AIRPILOT_WAKE_GUARD_MS = 800;

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_DIP = 7;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const RING_MCP = 13;
const PINKY_MCP = 17;

export const AIRPILOT_EMPHASIZED_LANDMARKS = new Set([
  THUMB_TIP,
  INDEX_MCP,
  INDEX_PIP,
  INDEX_DIP,
  INDEX_TIP,
]);

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

export function getAirPilotPalmSize(landmarks: OSBuddyAirControlLandmark[]) {
  return Math.max(
    0.001,
    distance(landmarkAt(landmarks, WRIST), landmarkAt(landmarks, MIDDLE_MCP)),
    distance(landmarkAt(landmarks, INDEX_MCP), landmarkAt(landmarks, PINKY_MCP)),
  );
}

export function getAirPilotThumbIndexRatio(hand: OSBuddyAirControlHand | null) {
  if (!hand || hand.landmarks.length < OS_BUDDY_HAND_LANDMARK_COUNT) return null;
  return (
    distance(landmarkAt(hand.landmarks, THUMB_TIP), landmarkAt(hand.landmarks, INDEX_TIP)) /
    getAirPilotPalmSize(hand.landmarks)
  );
}

export function getAirPilotPalmCenter(hand: OSBuddyAirControlHand | null) {
  if (!hand || hand.landmarks.length < OS_BUDDY_HAND_LANDMARK_COUNT) return null;
  const anchors = [WRIST, INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP]
    .map((index) => landmarkAt(hand.landmarks, index))
    .filter(Boolean) as OSBuddyAirControlLandmark[];
  if (anchors.length === 0) return null;

  return {
    x: anchors.reduce((sum, landmark) => sum + landmark.x, 0) / anchors.length,
    y: anchors.reduce((sum, landmark) => sum + landmark.y, 0) / anchors.length,
  };
}

export type AirPilotPinchMachine = {
  phase: OSBuddyAirPilotPinchState;
  openSince: number | null;
  pinchSince: number | null;
  cooldownUntil: number | null;
  armedPoint: OSBuddyAirControlPoint | null;
  latchedSelectionPoint: OSBuddyAirControlPoint | null;
};

export type AirPilotPinchUpdate = {
  state: AirPilotPinchMachine;
  selectedPoint: OSBuddyAirControlPoint | null;
};

export function createAirPilotPinchMachine(): AirPilotPinchMachine {
  return {
    phase: "tracking",
    openSince: null,
    pinchSince: null,
    cooldownUntil: null,
    armedPoint: null,
    latchedSelectionPoint: null,
  };
}

export function updateAirPilotPinchMachine(params: {
  previous: AirPilotPinchMachine;
  now: number;
  cursor: OSBuddyAirControlPoint | null;
  thumbIndexRatio: number | null;
  wakeGuardUntil?: number | null;
}): AirPilotPinchUpdate {
  const { previous, now, cursor, thumbIndexRatio } = params;
  const wakeGuardUntil = params.wakeGuardUntil ?? 0;

  if (!cursor || thumbIndexRatio == null) {
    return {
      state: {
        ...createAirPilotPinchMachine(),
        cooldownUntil:
          previous.cooldownUntil && previous.cooldownUntil > now
            ? previous.cooldownUntil
            : null,
      },
      selectedPoint: null,
    };
  }

  if (previous.cooldownUntil && previous.cooldownUntil > now) {
    return {
      state: {
        ...previous,
        phase: "cooldown",
        openSince: null,
        pinchSince: null,
        latchedSelectionPoint: null,
      },
      selectedPoint: null,
    };
  }

  const isOpen = thumbIndexRatio >= AIRPILOT_OPEN_RATIO_THRESHOLD;
  const isPinched = thumbIndexRatio <= AIRPILOT_PINCH_RATIO_THRESHOLD;

  if (isOpen) {
    const openSince = previous.openSince ?? now;
    const isPrepared = now - openSince >= AIRPILOT_OPEN_HOLD_MS && now >= wakeGuardUntil;
    return {
      state: {
        phase: isPrepared ? "prepared" : "tracking",
        openSince,
        pinchSince: null,
        cooldownUntil: null,
        armedPoint: isPrepared ? cursor : previous.armedPoint,
        latchedSelectionPoint: null,
      },
      selectedPoint: null,
    };
  }

  if ((previous.phase === "prepared" || previous.phase === "pinching") && isPinched) {
    const pinchSince = previous.pinchSince ?? now;
    const latchedSelectionPoint =
      previous.latchedSelectionPoint ?? previous.armedPoint ?? cursor;
    const canSelect =
      now - pinchSince >= AIRPILOT_PINCH_HOLD_MS && now >= wakeGuardUntil;

    if (canSelect) {
      return {
        state: {
          phase: "cooldown",
          openSince: null,
          pinchSince: null,
          cooldownUntil: now + AIRPILOT_SELECTION_COOLDOWN_MS,
          armedPoint: null,
          latchedSelectionPoint: null,
        },
        selectedPoint: latchedSelectionPoint,
      };
    }

    return {
      state: {
        phase: "pinching",
        openSince: previous.openSince,
        pinchSince,
        cooldownUntil: null,
        armedPoint: previous.armedPoint ?? cursor,
        latchedSelectionPoint,
      },
      selectedPoint: null,
    };
  }

  return {
    state: {
      phase: "tracking",
      openSince: null,
      pinchSince: null,
      cooldownUntil: null,
      armedPoint: previous.armedPoint,
      latchedSelectionPoint: null,
    },
    selectedPoint: null,
  };
}
