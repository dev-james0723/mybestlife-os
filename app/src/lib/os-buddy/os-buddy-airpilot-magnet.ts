import type {
  OSBuddyAirControlHand,
  OSBuddyAirControlLandmark,
  OSBuddyAirControlPoint,
  OSBuddyAirPilotMagnetPhase,
  OSBuddyAirPilotSelectState,
} from "./os-buddy-air-control-types";

export const AIRPILOT_MAGNET_RADIUS_PX = 48;
export const AIRPILOT_MAGNET_DWELL_MS = 300;
export const AIRPILOT_MAGNET_JITTER_PX = 24;
export const AIRPILOT_MAGNET_ESCAPE_PX = 72;
export const AIRPILOT_INDEX_TAP_ARM_MS = 80;
export const AIRPILOT_INDEX_TAP_RELEASE_THRESHOLD = 0.06;
export const AIRPILOT_INDEX_TAP_TRIGGER_THRESHOLD = 0.11;
export const AIRPILOT_INDEX_TAP_DELTA_THRESHOLD = 0.055;
export const AIRPILOT_SELECTION_COOLDOWN_MS = 600;

const HAND_LANDMARK_COUNT = 21;
const WRIST = 0;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_DIP = 7;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const RING_MCP = 13;
const PINKY_MCP = 17;

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

type AirPilotIndexTapPose = {
  pip: Vec3;
  dip: Vec3;
  tip: Vec3;
};

export type AirPilotMagnetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AirPilotMagnetTarget = {
  key: string;
  label?: string;
  center: OSBuddyAirControlPoint;
  rect: AirPilotMagnetRect;
};

export type AirPilotMagnetMachine = {
  phase: OSBuddyAirPilotMagnetPhase;
  candidateTarget: AirPilotMagnetTarget | null;
  candidateSince: number | null;
  candidateStartCursor: OSBuddyAirControlPoint | null;
  lockedTarget: AirPilotMagnetTarget | null;
  lockedAt: number | null;
  tapBaseline: AirPilotIndexTapPose | null;
  tapArmedAt: number | null;
  lastTapScore: number;
  cooldownUntil: number | null;
};

export type AirPilotMagnetUpdate = {
  state: AirPilotMagnetMachine;
  cursor: OSBuddyAirControlPoint | null;
  selectedPoint: OSBuddyAirControlPoint | null;
  target: AirPilotMagnetTarget | null;
  selectState: OSBuddyAirPilotSelectState;
  indexTapScore: number | null;
};

export function createAirPilotMagnetMachine(): AirPilotMagnetMachine {
  return {
    phase: "tracking",
    candidateTarget: null,
    candidateSince: null,
    candidateStartCursor: null,
    lockedTarget: null,
    lockedAt: null,
    tapBaseline: null,
    tapArmedAt: null,
    lastTapScore: 0,
    cooldownUntil: null,
  };
}

function distance(a: OSBuddyAirControlPoint, b: OSBuddyAirControlPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distance3D(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function landmarkAt(
  landmarks: OSBuddyAirControlLandmark[],
  index: number,
): OSBuddyAirControlLandmark | null {
  return landmarks[index] ?? null;
}

function toVec3(landmark: OSBuddyAirControlLandmark): Vec3 {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z ?? 0,
  };
}

function sameTarget(a: AirPilotMagnetTarget | null, b: AirPilotMagnetTarget | null) {
  return Boolean(a && b && a.key === b.key);
}

function activeCooldown(previous: AirPilotMagnetMachine, now: number) {
  return previous.cooldownUntil && previous.cooldownUntil > now
    ? previous.cooldownUntil
    : null;
}

function pointInsideInflatedRect(
  point: OSBuddyAirControlPoint,
  rect: AirPilotMagnetRect,
  padding: number,
) {
  return (
    point.x >= rect.x - padding &&
    point.x <= rect.x + rect.width + padding &&
    point.y >= rect.y - padding &&
    point.y <= rect.y + rect.height + padding
  );
}

function getTapLandmarks(hand: OSBuddyAirControlHand | null) {
  if (!hand) return null;
  const landmarks =
    hand.worldLandmarks && hand.worldLandmarks.length >= HAND_LANDMARK_COUNT
      ? hand.worldLandmarks
      : hand.landmarks;
  return landmarks.length >= HAND_LANDMARK_COUNT ? landmarks : null;
}

function getPalmCenter(landmarks: OSBuddyAirControlLandmark[]): Vec3 | null {
  const anchors = [WRIST, INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP]
    .map((index) => landmarkAt(landmarks, index))
    .filter(Boolean) as OSBuddyAirControlLandmark[];
  if (anchors.length === 0) return null;

  return {
    x: anchors.reduce((sum, landmark) => sum + landmark.x, 0) / anchors.length,
    y: anchors.reduce((sum, landmark) => sum + landmark.y, 0) / anchors.length,
    z: anchors.reduce((sum, landmark) => sum + (landmark.z ?? 0), 0) / anchors.length,
  };
}

function getPalmSize(landmarks: OSBuddyAirControlLandmark[]) {
  const wrist = landmarkAt(landmarks, WRIST);
  const middleMcp = landmarkAt(landmarks, MIDDLE_MCP);
  const indexMcp = landmarkAt(landmarks, INDEX_MCP);
  const pinkyMcp = landmarkAt(landmarks, PINKY_MCP);
  if (!wrist || !middleMcp || !indexMcp || !pinkyMcp) return 0.001;
  return Math.max(
    0.001,
    distance3D(toVec3(wrist), toVec3(middleMcp)),
    distance3D(toVec3(indexMcp), toVec3(pinkyMcp)),
  );
}

function normalizeJoint(
  landmark: OSBuddyAirControlLandmark | null,
  palmCenter: Vec3,
  palmSize: number,
) {
  if (!landmark) return null;
  return {
    x: (landmark.x - palmCenter.x) / palmSize,
    y: (landmark.y - palmCenter.y) / palmSize,
    z: ((landmark.z ?? 0) - palmCenter.z) / palmSize,
  };
}

export function getAirPilotIndexTapPose(
  hand: OSBuddyAirControlHand | null,
): AirPilotIndexTapPose | null {
  const landmarks = getTapLandmarks(hand);
  if (!landmarks) return null;

  const palmCenter = getPalmCenter(landmarks);
  if (!palmCenter) return null;

  const palmSize = getPalmSize(landmarks);
  const pip = normalizeJoint(landmarkAt(landmarks, INDEX_PIP), palmCenter, palmSize);
  const dip = normalizeJoint(landmarkAt(landmarks, INDEX_DIP), palmCenter, palmSize);
  const tip = normalizeJoint(landmarkAt(landmarks, INDEX_TIP), palmCenter, palmSize);
  if (!pip || !dip || !tip) return null;

  return { pip, dip, tip };
}

export function getAirPilotIndexTapScore(
  pose: AirPilotIndexTapPose | null,
  baseline: AirPilotIndexTapPose | null,
) {
  if (!pose || !baseline) return null;
  return (
    distance3D(pose.pip, baseline.pip) * 0.25 +
    distance3D(pose.dip, baseline.dip) * 0.35 +
    distance3D(pose.tip, baseline.tip) * 0.4
  );
}

function trackingState(cooldownUntil: number | null): AirPilotMagnetMachine {
  return {
    ...createAirPilotMagnetMachine(),
    cooldownUntil,
  };
}

function beginCandidate(params: {
  target: AirPilotMagnetTarget;
  rawCursor: OSBuddyAirControlPoint;
  now: number;
  cooldownUntil: number | null;
}): AirPilotMagnetMachine {
  return {
    ...createAirPilotMagnetMachine(),
    phase: "candidate",
    candidateTarget: params.target,
    candidateSince: params.now,
    candidateStartCursor: params.rawCursor,
    cooldownUntil: params.cooldownUntil,
  };
}

function lockTarget(params: {
  target: AirPilotMagnetTarget;
  now: number;
  hand: OSBuddyAirControlHand | null;
  cooldownUntil: number | null;
}): AirPilotMagnetMachine {
  const tapBaseline = getAirPilotIndexTapPose(params.hand);
  return {
    ...createAirPilotMagnetMachine(),
    phase: "locked",
    lockedTarget: params.target,
    lockedAt: params.now,
    tapBaseline,
    tapArmedAt: tapBaseline ? params.now : null,
    cooldownUntil: params.cooldownUntil,
  };
}

function updateLocked(params: {
  previous: AirPilotMagnetMachine;
  lockedTarget: AirPilotMagnetTarget;
  rawCursor: OSBuddyAirControlPoint;
  hand: OSBuddyAirControlHand | null;
  now: number;
  wakeGuardUntil: number;
  cooldownUntil: number | null;
}): AirPilotMagnetUpdate {
  const { previous, lockedTarget, rawCursor, hand, now, wakeGuardUntil, cooldownUntil } = params;
  const escaped =
    distance(rawCursor, lockedTarget.center) > AIRPILOT_MAGNET_ESCAPE_PX ||
    !pointInsideInflatedRect(rawCursor, lockedTarget.rect, AIRPILOT_MAGNET_ESCAPE_PX);

  if (escaped) {
    return {
      state: trackingState(cooldownUntil),
      cursor: rawCursor,
      selectedPoint: null,
      target: null,
      selectState: cooldownUntil ? "cooldown" : "tracking",
      indexTapScore: null,
    };
  }

  const pose = getAirPilotIndexTapPose(hand);
  const baseline = previous.tapBaseline ?? pose;
  const indexTapScore = getAirPilotIndexTapScore(pose, baseline);
  const released =
    indexTapScore != null && indexTapScore <= AIRPILOT_INDEX_TAP_RELEASE_THRESHOLD;
  const tapBaseline = released ? pose : baseline;
  const tapArmedAt =
    previous.tapArmedAt ?? (tapBaseline ? now : null);

  if (cooldownUntil) {
    return {
      state: {
        ...previous,
        phase: "locked",
        lockedTarget,
        candidateTarget: null,
        candidateSince: null,
        candidateStartCursor: null,
        lockedAt: previous.lockedAt ?? now,
        tapBaseline,
        tapArmedAt: released ? now : tapArmedAt,
        lastTapScore: indexTapScore ?? previous.lastTapScore,
        cooldownUntil,
      },
      cursor: lockedTarget.center,
      selectedPoint: null,
      target: lockedTarget,
      selectState: "cooldown",
      indexTapScore,
    };
  }

  if (!tapBaseline || tapArmedAt == null) {
    return {
      state: {
        ...previous,
        phase: "locked",
        lockedTarget,
        candidateTarget: null,
        candidateSince: null,
        candidateStartCursor: null,
        lockedAt: previous.lockedAt ?? now,
        tapBaseline,
        tapArmedAt,
        lastTapScore: indexTapScore ?? previous.lastTapScore,
        cooldownUntil: null,
      },
      cursor: lockedTarget.center,
      selectedPoint: null,
      target: lockedTarget,
      selectState: "locked",
      indexTapScore,
    };
  }

  const armed = now - tapArmedAt >= AIRPILOT_INDEX_TAP_ARM_MS && now >= wakeGuardUntil;
  const previousScore = previous.lastTapScore;
  const risingTap =
    indexTapScore != null &&
    previousScore <= AIRPILOT_INDEX_TAP_TRIGGER_THRESHOLD &&
    indexTapScore - previousScore >= AIRPILOT_INDEX_TAP_DELTA_THRESHOLD;
  const canSelect =
    armed &&
    indexTapScore != null &&
    (previousScore <= AIRPILOT_INDEX_TAP_RELEASE_THRESHOLD || risingTap) &&
    indexTapScore >= AIRPILOT_INDEX_TAP_TRIGGER_THRESHOLD;

  if (canSelect) {
    return {
      state: {
        ...previous,
        phase: "locked",
        lockedTarget,
        candidateTarget: null,
        candidateSince: null,
        candidateStartCursor: null,
        lockedAt: previous.lockedAt ?? now,
        tapBaseline,
        tapArmedAt,
        lastTapScore: indexTapScore,
        cooldownUntil: now + AIRPILOT_SELECTION_COOLDOWN_MS,
      },
      cursor: lockedTarget.center,
      selectedPoint: lockedTarget.center,
      target: lockedTarget,
      selectState: "tapping",
      indexTapScore,
    };
  }

  return {
    state: {
      ...previous,
      phase: "locked",
      lockedTarget,
      candidateTarget: null,
      candidateSince: null,
      candidateStartCursor: null,
      lockedAt: previous.lockedAt ?? now,
      tapBaseline,
      tapArmedAt: released ? now : tapArmedAt,
      lastTapScore: indexTapScore ?? previous.lastTapScore,
      cooldownUntil: null,
    },
    cursor: lockedTarget.center,
    selectedPoint: null,
    target: lockedTarget,
    selectState: armed ? "armed" : "locked",
    indexTapScore,
  };
}

export function updateAirPilotMagnetMachine(params: {
  previous: AirPilotMagnetMachine;
  now: number;
  rawCursor: OSBuddyAirControlPoint | null;
  target: AirPilotMagnetTarget | null;
  hand: OSBuddyAirControlHand | null;
  wakeGuardUntil?: number | null;
}): AirPilotMagnetUpdate {
  const { previous, now, rawCursor, target, hand } = params;
  const wakeGuardUntil = params.wakeGuardUntil ?? 0;
  const cooldownUntil = activeCooldown(previous, now);

  if (!rawCursor) {
    return {
      state: trackingState(cooldownUntil),
      cursor: null,
      selectedPoint: null,
      target: null,
      selectState: cooldownUntil ? "cooldown" : "tracking",
      indexTapScore: null,
    };
  }

  if (previous.phase === "locked" && previous.lockedTarget) {
    return updateLocked({
      previous,
      lockedTarget: previous.lockedTarget,
      rawCursor,
      hand,
      now,
      wakeGuardUntil,
      cooldownUntil,
    });
  }

  if (!target) {
    return {
      state: trackingState(cooldownUntil),
      cursor: rawCursor,
      selectedPoint: null,
      target: null,
      selectState: cooldownUntil ? "cooldown" : "tracking",
      indexTapScore: null,
    };
  }

  if (
    previous.phase === "candidate" &&
    sameTarget(previous.candidateTarget, target) &&
    previous.candidateSince != null &&
    previous.candidateStartCursor
  ) {
    const cursorDrift = distance(rawCursor, previous.candidateStartCursor);
    if (cursorDrift > AIRPILOT_MAGNET_JITTER_PX) {
      return {
        state: beginCandidate({ target, rawCursor, now, cooldownUntil }),
        cursor: rawCursor,
        selectedPoint: null,
        target,
        selectState: cooldownUntil ? "cooldown" : "candidate",
        indexTapScore: null,
      };
    }

    if (now - previous.candidateSince >= AIRPILOT_MAGNET_DWELL_MS) {
      const state = lockTarget({ target, now, hand, cooldownUntil });
      return {
        state,
        cursor: target.center,
        selectedPoint: null,
        target,
        selectState: cooldownUntil ? "cooldown" : "locked",
        indexTapScore: 0,
      };
    }

    return {
      state: {
        ...previous,
        candidateTarget: target,
        cooldownUntil,
      },
      cursor: rawCursor,
      selectedPoint: null,
      target,
      selectState: cooldownUntil ? "cooldown" : "candidate",
      indexTapScore: null,
    };
  }

  return {
    state: beginCandidate({ target, rawCursor, now, cooldownUntil }),
    cursor: rawCursor,
    selectedPoint: null,
    target,
    selectState: cooldownUntil ? "cooldown" : "candidate",
    indexTapScore: null,
  };
}
