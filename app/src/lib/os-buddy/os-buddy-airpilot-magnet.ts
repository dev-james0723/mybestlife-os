import {
  AIRPILOT_OPEN_HOLD_MS,
  AIRPILOT_OPEN_RATIO_THRESHOLD,
  AIRPILOT_PINCH_HOLD_MS,
  AIRPILOT_PINCH_RATIO_THRESHOLD,
  AIRPILOT_SELECTION_COOLDOWN_MS,
} from "./os-buddy-airpilot-pinch";
import type {
  OSBuddyAirControlPoint,
  OSBuddyAirPilotMagnetPhase,
  OSBuddyAirPilotPinchState,
} from "./os-buddy-air-control-types";

export const AIRPILOT_MAGNET_RADIUS_PX = 48;
export const AIRPILOT_MAGNET_DWELL_MS = 300;
export const AIRPILOT_MAGNET_JITTER_PX = 24;
export const AIRPILOT_MAGNET_ESCAPE_PX = 72;

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
  openSince: number | null;
  pinchSince: number | null;
  openedWhileLocked: boolean;
  cooldownUntil: number | null;
};

export type AirPilotMagnetUpdate = {
  state: AirPilotMagnetMachine;
  cursor: OSBuddyAirControlPoint | null;
  selectedPoint: OSBuddyAirControlPoint | null;
  target: AirPilotMagnetTarget | null;
  pinchState: OSBuddyAirPilotPinchState;
};

export function createAirPilotMagnetMachine(): AirPilotMagnetMachine {
  return {
    phase: "tracking",
    candidateTarget: null,
    candidateSince: null,
    candidateStartCursor: null,
    lockedTarget: null,
    openSince: null,
    pinchSince: null,
    openedWhileLocked: false,
    cooldownUntil: null,
  };
}

function distance(a: OSBuddyAirControlPoint, b: OSBuddyAirControlPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
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
  cooldownUntil: number | null;
}): AirPilotMagnetMachine {
  return {
    ...createAirPilotMagnetMachine(),
    phase: "locked",
    lockedTarget: params.target,
    cooldownUntil: params.cooldownUntil,
  };
}

function updateLocked(params: {
  previous: AirPilotMagnetMachine;
  lockedTarget: AirPilotMagnetTarget;
  rawCursor: OSBuddyAirControlPoint;
  now: number;
  thumbIndexRatio: number | null;
  wakeGuardUntil: number;
  cooldownUntil: number | null;
}): AirPilotMagnetUpdate {
  const {
    previous,
    lockedTarget,
    rawCursor,
    now,
    thumbIndexRatio,
    wakeGuardUntil,
    cooldownUntil,
  } = params;
  const escaped =
    distance(rawCursor, lockedTarget.center) > AIRPILOT_MAGNET_ESCAPE_PX ||
    !pointInsideInflatedRect(rawCursor, lockedTarget.rect, AIRPILOT_MAGNET_ESCAPE_PX);

  if (escaped) {
    return {
      state: trackingState(cooldownUntil),
      cursor: rawCursor,
      selectedPoint: null,
      target: null,
      pinchState: cooldownUntil ? "cooldown" : "tracking",
    };
  }

  if (cooldownUntil) {
    return {
      state: {
        ...previous,
        phase: "locked",
        lockedTarget,
        candidateTarget: null,
        candidateSince: null,
        candidateStartCursor: null,
        openSince: null,
        pinchSince: null,
        openedWhileLocked: false,
        cooldownUntil,
      },
      cursor: lockedTarget.center,
      selectedPoint: null,
      target: lockedTarget,
      pinchState: "cooldown",
    };
  }

  const isOpen = thumbIndexRatio != null && thumbIndexRatio >= AIRPILOT_OPEN_RATIO_THRESHOLD;
  const isPinched = thumbIndexRatio != null && thumbIndexRatio <= AIRPILOT_PINCH_RATIO_THRESHOLD;

  if (isOpen) {
    const openSince = previous.openSince ?? now;
    const openedWhileLocked =
      previous.openedWhileLocked ||
      (now - openSince >= AIRPILOT_OPEN_HOLD_MS && now >= wakeGuardUntil);

    return {
      state: {
        ...previous,
        phase: "locked",
        lockedTarget,
        candidateTarget: null,
        candidateSince: null,
        candidateStartCursor: null,
        openSince,
        pinchSince: null,
        openedWhileLocked,
        cooldownUntil: null,
      },
      cursor: lockedTarget.center,
      selectedPoint: null,
      target: lockedTarget,
      pinchState: openedWhileLocked ? "prepared" : "tracking",
    };
  }

  if (previous.openedWhileLocked && isPinched) {
    const pinchSince = previous.pinchSince ?? now;
    const canSelect = now - pinchSince >= AIRPILOT_PINCH_HOLD_MS && now >= wakeGuardUntil;

    if (canSelect) {
      return {
        state: {
          ...previous,
          phase: "locked",
          lockedTarget,
          candidateTarget: null,
          candidateSince: null,
          candidateStartCursor: null,
          openSince: null,
          pinchSince: null,
          openedWhileLocked: false,
          cooldownUntil: now + AIRPILOT_SELECTION_COOLDOWN_MS,
        },
        cursor: lockedTarget.center,
        selectedPoint: lockedTarget.center,
        target: lockedTarget,
        pinchState: "cooldown",
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
        openSince: previous.openSince,
        pinchSince,
        cooldownUntil: null,
      },
      cursor: lockedTarget.center,
      selectedPoint: null,
      target: lockedTarget,
      pinchState: "pinching",
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
      openSince: previous.openedWhileLocked ? previous.openSince : null,
      pinchSince: null,
      cooldownUntil: null,
    },
    cursor: lockedTarget.center,
    selectedPoint: null,
    target: lockedTarget,
    pinchState: previous.openedWhileLocked ? "prepared" : "tracking",
  };
}

export function updateAirPilotMagnetMachine(params: {
  previous: AirPilotMagnetMachine;
  now: number;
  rawCursor: OSBuddyAirControlPoint | null;
  target: AirPilotMagnetTarget | null;
  thumbIndexRatio: number | null;
  wakeGuardUntil?: number | null;
}): AirPilotMagnetUpdate {
  const { previous, now, rawCursor, target, thumbIndexRatio } = params;
  const wakeGuardUntil = params.wakeGuardUntil ?? 0;
  const cooldownUntil = activeCooldown(previous, now);

  if (!rawCursor) {
    return {
      state: trackingState(cooldownUntil),
      cursor: null,
      selectedPoint: null,
      target: null,
      pinchState: cooldownUntil ? "cooldown" : "tracking",
    };
  }

  if (previous.phase === "locked" && previous.lockedTarget) {
    return updateLocked({
      previous,
      lockedTarget: previous.lockedTarget,
      rawCursor,
      now,
      thumbIndexRatio,
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
      pinchState: cooldownUntil ? "cooldown" : "tracking",
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
        pinchState: cooldownUntil ? "cooldown" : "tracking",
      };
    }

    if (now - previous.candidateSince >= AIRPILOT_MAGNET_DWELL_MS) {
      const state = lockTarget({ target, cooldownUntil });
      return {
        state,
        cursor: target.center,
        selectedPoint: null,
        target,
        pinchState: cooldownUntil ? "cooldown" : "tracking",
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
      pinchState: cooldownUntil ? "cooldown" : "tracking",
    };
  }

  return {
    state: beginCandidate({ target, rawCursor, now, cooldownUntil }),
    cursor: rawCursor,
    selectedPoint: null,
    target,
    pinchState: cooldownUntil ? "cooldown" : "tracking",
  };
}
