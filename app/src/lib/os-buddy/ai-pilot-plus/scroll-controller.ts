import type {
  AIPilotPlusConfig,
  AIPilotPlusFrame,
  AIPilotPlusPoint,
} from "./types";

export type AIPilotPlusScrollState = {
  status: "idle" | "anchored" | "scrolling" | "inertia";
  anchorPalm: AIPilotPlusPoint | null;
  activeSince: number | null;
  previousPalm: AIPilotPlusPoint | null;
  lastFrameAt: number | null;
  smoothedOffsetY: number;
  lastDeltaY: number;
  inertiaStartedAt: number | null;
  inertiaInitialDeltaY: number;
};

export type StepAIPilotPlusScrollResult = {
  next: AIPilotPlusScrollState;
  deltaY: number | null;
  point: AIPilotPlusPoint | null;
};

export function createAIPilotPlusScrollState(): AIPilotPlusScrollState {
  return {
    status: "idle",
    anchorPalm: null,
    previousPalm: null,
    activeSince: null,
    lastFrameAt: null,
    smoothedOffsetY: 0,
    lastDeltaY: 0,
    inertiaStartedAt: null,
    inertiaInitialDeltaY: 0,
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
    if (
      !config.scrollReducedMotion &&
      previous.status === "scrolling" &&
      Math.abs(previous.lastDeltaY) >= config.scrollInertiaMinDeltaY
    ) {
      const next: AIPilotPlusScrollState = {
        ...createAIPilotPlusScrollState(),
        status: "inertia",
        lastFrameAt: frame.now,
        inertiaStartedAt: frame.now,
        inertiaInitialDeltaY: previous.lastDeltaY,
        lastDeltaY: previous.lastDeltaY,
      };

      return {
        next,
        deltaY: previous.lastDeltaY,
        point: previous.previousPalm,
      };
    }

    if (
      !config.scrollReducedMotion &&
      previous.status === "inertia" &&
      previous.inertiaStartedAt != null
    ) {
      const elapsed = frame.now - previous.inertiaStartedAt;
      const progress =
        config.scrollInertiaDurationMs <= 0
          ? 1
          : Math.min(1, Math.max(0, elapsed / config.scrollInertiaDurationMs));
      const decay = Math.pow(1 - progress, 2);
      const deltaY = previous.inertiaInitialDeltaY * decay;

      if (
        progress < 1 &&
        Math.abs(deltaY) >= config.scrollInertiaMinDeltaY
      ) {
        return {
          next: {
            ...previous,
            status: "inertia",
            lastFrameAt: frame.now,
            lastDeltaY: deltaY,
          },
          deltaY,
          point: previous.previousPalm,
        };
      }
    }

    return {
      next: createAIPilotPlusScrollState(),
      deltaY: null,
      point: null,
    };
  }

  const anchorPalm = previous.anchorPalm ?? frame.palm;
  const activeSince = previous.activeSince ?? frame.now;
  const dtMs =
    previous.lastFrameAt == null
      ? 16
      : Math.min(80, Math.max(8, frame.now - previous.lastFrameAt));

  if (!previous.anchorPalm) {
    return {
      next: {
        status: "anchored",
        anchorPalm,
        previousPalm: frame.palm,
        activeSince,
        lastFrameAt: frame.now,
        smoothedOffsetY: 0,
        lastDeltaY: 0,
        inertiaStartedAt: null,
        inertiaInitialDeltaY: 0,
      },
      deltaY: null,
      point: frame.palm,
    };
  }

  const rawOffsetY = frame.palm.y - anchorPalm.y;
  const absOffsetY = Math.abs(rawOffsetY);
  const deadzonedOffsetY =
    absOffsetY > config.scrollDeadzonePx
      ? Math.sign(rawOffsetY) * (absOffsetY - config.scrollDeadzonePx)
      : 0;
  const alpha = Math.min(1, Math.max(0, config.scrollSmoothingAlpha));
  const smoothedOffsetY =
    previous.smoothedOffsetY + (deadzonedOffsetY - previous.smoothedOffsetY) * alpha;
  const palmVelocityY =
    previous.previousPalm == null
      ? 0
      : (frame.palm.y - previous.previousPalm.y) / dtMs;
  const rawScrollDeltaY =
    smoothedOffsetY * config.scrollScale +
    palmVelocityY * config.scrollVelocityScale;
  const deltaY =
    Math.abs(smoothedOffsetY) > 0.5
      ? clamp(
          rawScrollDeltaY,
          -config.scrollMaxDeltaY,
          config.scrollMaxDeltaY,
        )
      : null;

  return {
    next: {
      status: deltaY == null ? "anchored" : "scrolling",
      anchorPalm,
      previousPalm: frame.palm,
      activeSince,
      lastFrameAt: frame.now,
      smoothedOffsetY,
      lastDeltaY: deltaY ?? 0,
      inertiaStartedAt: null,
      inertiaInitialDeltaY: 0,
    },
    deltaY,
    point: frame.palm,
  };
}
