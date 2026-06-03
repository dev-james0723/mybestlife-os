import {
  createAIPilotPlusScrollState,
  stepAIPilotPlusScroll,
  type AIPilotPlusScrollState,
} from "./scroll-controller";
import {
  detectLockedIndexTap,
  detectTwoHandZoom,
} from "./recognizer";
import {
  DEFAULT_AI_PILOT_PLUS_CONFIG,
  type AIPilotPlusConfig,
  type AIPilotPlusFrame,
  type AIPilotPlusIntent,
  type AIPilotPlusMode,
  type AIPilotPlusTarget,
  type AIPilotPlusVector,
} from "./types";

export type AIPilotPlusMachineState = {
  active: boolean;
  mode: AIPilotPlusMode;
  previousFrame: AIPilotPlusFrame | null;
  scroll: AIPilotPlusScrollState;
  lockedTargetId: string | null;
  lockedSince: number | null;
  lockedIndexPalmVector: AIPilotPlusVector | null;
  previousLockedIndexPalmVector: AIPilotPlusVector | null;
  lastSelectAt: number | null;
};

export type StepAIPilotPlusMachineResult = {
  next: AIPilotPlusMachineState;
  intents: AIPilotPlusIntent[];
};

export function createAIPilotPlusMachineState(): AIPilotPlusMachineState {
  return {
    active: false,
    mode: "inactive",
    previousFrame: null,
    scroll: createAIPilotPlusScrollState(),
    lockedTargetId: null,
    lockedSince: null,
    lockedIndexPalmVector: null,
    previousLockedIndexPalmVector: null,
    lastSelectAt: null,
  };
}

function withDefaults(config?: Partial<AIPilotPlusConfig>): AIPilotPlusConfig {
  return {
    ...DEFAULT_AI_PILOT_PLUS_CONFIG,
    ...config,
  };
}

function isSameTarget(
  previousTargetId: string | null,
  target: AIPilotPlusTarget | null,
): boolean {
  return previousTargetId != null && target != null && previousTargetId === target.id;
}

function stepLockedTarget(params: {
  previous: AIPilotPlusMachineState;
  frame: AIPilotPlusFrame;
  target: AIPilotPlusTarget;
  config: AIPilotPlusConfig;
}): StepAIPilotPlusMachineResult {
  const { previous, frame, target, config } = params;
  const sameTarget = isSameTarget(previous.lockedTargetId, target);
  const lockedSince = sameTarget ? previous.lockedSince ?? frame.now : frame.now;
  const baseline = sameTarget
    ? previous.lockedIndexPalmVector
    : frame.indexPalmVector;
  const previousVector = sameTarget
    ? previous.previousLockedIndexPalmVector
    : frame.indexPalmVector;
  const cooldownActive =
    previous.lastSelectAt != null &&
    frame.now - previous.lastSelectAt < config.selectCooldownMs;
  const armed = frame.now - lockedSince >= config.lockedArmMs;
  const tap = detectLockedIndexTap({
    baseline,
    previous: previousVector,
    current: frame.indexPalmVector,
    config,
  });

  const baseNext: AIPilotPlusMachineState = {
    ...previous,
    active: true,
    mode: cooldownActive ? "cooldown" : "locked",
    previousFrame: frame,
    scroll: createAIPilotPlusScrollState(),
    lockedTargetId: target.id,
    lockedSince,
    lockedIndexPalmVector: baseline,
    previousLockedIndexPalmVector: frame.indexPalmVector,
  };

  if (armed && !cooldownActive && tap.selected) {
    return {
      next: {
        ...baseNext,
        mode: "cooldown",
        lastSelectAt: frame.now,
      },
      intents: [
        {
          type: "target.select",
          target,
          point: target.center,
          gesture: frame.gesture,
          score: tap.score,
        },
      ],
    };
  }

  return {
    next: baseNext,
    intents: [
      {
        type: "target.hover",
        target,
        point: target.center,
      },
    ],
  };
}

export function stepAIPilotPlusMachine(params: {
  previous: AIPilotPlusMachineState;
  frame: AIPilotPlusFrame;
  config?: Partial<AIPilotPlusConfig>;
}): StepAIPilotPlusMachineResult {
  const config = withDefaults(params.config);
  const { previous, frame } = params;

  if (!frame.active) {
    return {
      next: createAIPilotPlusMachineState(),
      intents: [],
    };
  }

  if (frame.gesture === "Closed_Fist") {
    return {
      next: createAIPilotPlusMachineState(),
      intents: [
        {
          type: "lifecycle.stop",
          reason: "closed-fist",
          gesture: frame.gesture,
        },
      ],
    };
  }

  if (frame.lockedTarget && !frame.lockedTarget.disabled) {
    return stepLockedTarget({
      previous,
      frame,
      target: frame.lockedTarget,
      config,
    });
  }

  const scroll = stepAIPilotPlusScroll({
    previous: previous.scroll,
    frame,
    config,
  });
  const zoom = detectTwoHandZoom({
    previous: previous.previousFrame,
    current: frame,
    config,
  });
  const intents: AIPilotPlusIntent[] = [];

  if (frame.cursor) {
    intents.push({
      type: "tracking.cursor",
      point: frame.cursor,
      gesture: frame.gesture,
    });
  }

  if (scroll.deltaY != null && scroll.point) {
    intents.push({
      type: "page.scroll",
      point: scroll.point,
      deltaY: scroll.deltaY,
      gesture: frame.gesture,
    });
  }

  if (zoom) {
    intents.push({
      type: "viewport.zoom",
      center: zoom.center,
      scaleDelta: zoom.scaleDelta,
      gesture: frame.gesture,
    });
  }

  return {
    next: {
      ...previous,
      active: true,
      mode: scroll.deltaY != null ? "scrolling" : "tracking",
      previousFrame: frame,
      scroll: scroll.next,
      lockedTargetId: null,
      lockedSince: null,
      lockedIndexPalmVector: null,
      previousLockedIndexPalmVector: null,
    },
    intents,
  };
}
