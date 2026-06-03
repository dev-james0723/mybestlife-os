import type {
  AIPilotPlusConfig,
  AIPilotPlusFrame,
  AIPilotPlusPoint,
} from "./types";

export type AIPilotPlusScrollState = {
  previousPalm: AIPilotPlusPoint | null;
  activeSince: number | null;
};

export type StepAIPilotPlusScrollResult = {
  next: AIPilotPlusScrollState;
  deltaY: number | null;
  point: AIPilotPlusPoint | null;
};

export function createAIPilotPlusScrollState(): AIPilotPlusScrollState {
  return {
    previousPalm: null,
    activeSince: null,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function stepAIPilotPlusScroll(params: {
  previous: AIPilotPlusScrollState;
  frame: AIPilotPlusFrame;
  config: AIPilotPlusConfig;
}): StepAIPilotPlusScrollResult {
  const { previous, frame, config } = params;

  if (frame.gesture !== "Open_Palm" || !frame.palm) {
    return {
      next: createAIPilotPlusScrollState(),
      deltaY: null,
      point: null,
    };
  }

  if (!previous.previousPalm) {
    return {
      next: {
        previousPalm: frame.palm,
        activeSince: frame.now,
      },
      deltaY: null,
      point: frame.palm,
    };
  }

  const rawDeltaY = frame.palm.y - previous.previousPalm.y;
  const deltaY =
    Math.abs(rawDeltaY) >= config.scrollDeadzonePx
      ? clamp(
          rawDeltaY * config.scrollScale,
          -config.scrollMaxDeltaY,
          config.scrollMaxDeltaY,
        )
      : null;

  return {
    next: {
      previousPalm: frame.palm,
      activeSince: previous.activeSince ?? frame.now,
    },
    deltaY,
    point: frame.palm,
  };
}
