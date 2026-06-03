import type { OSBuddyAirControlGesture } from "../os-buddy-air-control-types";
import {
  createAIPilotPlusCountdownState,
  type AIPilotPlusCountdownState,
  type AIPilotPlusPilotMode,
} from "./interfaces";

export type AIPilotPlusModeMachineConfig = {
  activationHoldMs: number;
  activationConfidence: number;
  exitHoldMs: number;
  exitConfidence: number;
};

export const DEFAULT_AI_PILOT_PLUS_MODE_CONFIG: AIPilotPlusModeMachineConfig = {
  activationHoldMs: 2_000,
  activationConfidence: 0.8,
  exitHoldMs: 1_500,
  exitConfidence: 0.75,
};

export type AIPilotPlusModeMachineState = {
  mode: AIPilotPlusPilotMode;
  activationStartedAt: number | null;
  exitStartedAt: number | null;
  countdown: AIPilotPlusCountdownState;
};

export type AIPilotPlusModeMachineFrame = {
  active: boolean;
  now: number;
  gesture: OSBuddyAirControlGesture;
  handCount: number;
  confidence: number;
  bothHandsOpen: boolean;
};

export type AIPilotPlusModeMachineEvent =
  | { type: "plus-countdown-started" }
  | { type: "plus-countdown-cancelled" }
  | { type: "plus-activated" }
  | { type: "plus-exit-countdown-started" }
  | { type: "plus-exited" };

export type StepAIPilotPlusModeMachineResult = {
  next: AIPilotPlusModeMachineState;
  events: AIPilotPlusModeMachineEvent[];
};

function inactiveCountdown(durationMs = 0): AIPilotPlusCountdownState {
  return createAIPilotPlusCountdownState({
    kind: "inactive",
    now: 0,
    startedAt: null,
    durationMs,
    label: null,
  });
}

export function createAIPilotPlusModeMachineState(): AIPilotPlusModeMachineState {
  return {
    mode: "off",
    activationStartedAt: null,
    exitStartedAt: null,
    countdown: inactiveCountdown(),
  };
}

function withDefaults(
  config?: Partial<AIPilotPlusModeMachineConfig>,
): AIPilotPlusModeMachineConfig {
  return {
    ...DEFAULT_AI_PILOT_PLUS_MODE_CONFIG,
    ...config,
  };
}

function isActivationGesture(
  frame: AIPilotPlusModeMachineFrame,
  config: AIPilotPlusModeMachineConfig,
) {
  return (
    frame.active &&
    frame.gesture === "Victory" &&
    frame.handCount === 1 &&
    frame.confidence >= config.activationConfidence
  );
}

function isExitGesture(
  frame: AIPilotPlusModeMachineFrame,
  config: AIPilotPlusModeMachineConfig,
) {
  return (
    frame.active &&
    frame.handCount >= 2 &&
    frame.bothHandsOpen &&
    frame.confidence >= config.exitConfidence
  );
}

export function stepAIPilotPlusModeMachine(params: {
  previous: AIPilotPlusModeMachineState;
  frame: AIPilotPlusModeMachineFrame;
  config?: Partial<AIPilotPlusModeMachineConfig>;
}): StepAIPilotPlusModeMachineResult {
  const config = withDefaults(params.config);
  const { previous, frame } = params;

  if (!frame.active) {
    return {
      next: createAIPilotPlusModeMachineState(),
      events: [],
    };
  }

  if (previous.mode === "plusActive") {
    if (!isExitGesture(frame, config)) {
      return {
        next: {
          mode: "plusActive",
          activationStartedAt: null,
          exitStartedAt: null,
          countdown: inactiveCountdown(config.exitHoldMs),
        },
        events: [],
      };
    }

    const exitStartedAt = previous.exitStartedAt ?? frame.now;
    const elapsed = frame.now - exitStartedAt;
    if (elapsed >= config.exitHoldMs) {
      return {
        next: {
          mode: "normal",
          activationStartedAt: null,
          exitStartedAt: null,
          countdown: inactiveCountdown(config.exitHoldMs),
        },
        events: [{ type: "plus-exited" }],
      };
    }

    return {
      next: {
        mode: "plusActive",
        activationStartedAt: null,
        exitStartedAt,
        countdown: createAIPilotPlusCountdownState({
          kind: "plusExit",
          now: frame.now,
          startedAt: exitStartedAt,
          durationMs: config.exitHoldMs,
          label: "AI Pilot Plus exiting...",
        }),
      },
      events:
        previous.exitStartedAt == null
          ? [{ type: "plus-exit-countdown-started" }]
          : [],
    };
  }

  const activationGesture = isActivationGesture(frame, config);
  if (!activationGesture) {
    const wasCountingDown = previous.mode === "plusCountdown";
    return {
      next: {
        mode: "normal",
        activationStartedAt: null,
        exitStartedAt: null,
        countdown: inactiveCountdown(config.activationHoldMs),
      },
      events: wasCountingDown ? [{ type: "plus-countdown-cancelled" }] : [],
    };
  }

  const activationStartedAt =
    previous.mode === "plusCountdown" && previous.activationStartedAt != null
      ? previous.activationStartedAt
      : frame.now;
  const elapsed = frame.now - activationStartedAt;

  if (elapsed >= config.activationHoldMs) {
    return {
      next: {
        mode: "plusActive",
        activationStartedAt: null,
        exitStartedAt: null,
        countdown: inactiveCountdown(config.activationHoldMs),
      },
      events: [{ type: "plus-activated" }],
    };
  }

  return {
    next: {
      mode: "plusCountdown",
      activationStartedAt,
      exitStartedAt: null,
      countdown: createAIPilotPlusCountdownState({
        kind: "plusActivation",
        now: frame.now,
        startedAt: activationStartedAt,
        durationMs: config.activationHoldMs,
        label: "AI Pilot Plus activating...",
      }),
    },
    events:
      previous.mode !== "plusCountdown"
        ? [{ type: "plus-countdown-started" }]
        : [],
  };
}
