import type { AIPilotPlusPoint } from "./types";

export type AIPilotPlusCircleDirection = "clockwise" | "counterclockwise";

export type AIPilotPlusCircleRecognizerConfig = {
  windowMs: number;
  minDurationMs: number;
  minTotalAngleRad: number;
  minRadiusPx: number;
  maxRadiusDeviationRatio: number;
  minConfidence: number;
  cooldownMs: number;
};

export const DEFAULT_AI_PILOT_PLUS_CIRCLE_CONFIG: AIPilotPlusCircleRecognizerConfig = {
  windowMs: 1_250,
  minDurationMs: 450,
  minTotalAngleRad: Math.PI * 1.5,
  minRadiusPx: 18,
  maxRadiusDeviationRatio: 0.68,
  minConfidence: 0.72,
  cooldownMs: 900,
};

export type AIPilotPlusCircleSample = AIPilotPlusPoint & {
  at: number;
  confidence: number;
};

export type AIPilotPlusCircleRecognizerState = {
  samples: AIPilotPlusCircleSample[];
  lastEmittedAt: number | null;
};

export type AIPilotPlusCircleEvent = {
  type: "circle";
  direction: AIPilotPlusCircleDirection;
  center: AIPilotPlusPoint;
  radiusPx: number;
  totalAngleRad: number;
  confidence: number;
};

export type StepAIPilotPlusCircleRecognizerResult = {
  next: AIPilotPlusCircleRecognizerState;
  event: AIPilotPlusCircleEvent | null;
  trail: AIPilotPlusPoint[];
  progress: number;
};

export function createAIPilotPlusCircleRecognizerState(): AIPilotPlusCircleRecognizerState {
  return {
    samples: [],
    lastEmittedAt: null,
  };
}

function angleDelta(previous: number, current: number): number {
  let delta = current - previous;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function averagePoint(points: AIPilotPlusPoint[]): AIPilotPlusPoint {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function circleMetrics(samples: AIPilotPlusCircleSample[]) {
  const center = averagePoint(samples);
  const radii = samples.map((sample) => Math.hypot(sample.x - center.x, sample.y - center.y));
  const radiusPx = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;
  const radiusDeviation =
    radii.reduce((sum, radius) => sum + Math.abs(radius - radiusPx), 0) / radii.length;
  const angles = samples.map((sample) => Math.atan2(sample.y - center.y, sample.x - center.x));
  const totalAngleRad = angles.slice(1).reduce((sum, angle, index) => {
    return sum + angleDelta(angles[index] ?? angle, angle);
  }, 0);
  const confidence =
    samples.reduce((sum, sample) => sum + sample.confidence, 0) / samples.length;

  return {
    center,
    radiusPx,
    radiusDeviationRatio: radiusPx <= 0 ? 1 : radiusDeviation / radiusPx,
    totalAngleRad,
    confidence,
  };
}

export function stepAIPilotPlusCircleRecognizer(params: {
  previous: AIPilotPlusCircleRecognizerState;
  now: number;
  point: AIPilotPlusPoint | null;
  confidence: number;
  enabled: boolean;
  config?: Partial<AIPilotPlusCircleRecognizerConfig>;
}): StepAIPilotPlusCircleRecognizerResult {
  const config = {
    ...DEFAULT_AI_PILOT_PLUS_CIRCLE_CONFIG,
    ...params.config,
  };

  if (!params.enabled || !params.point || params.confidence < config.minConfidence) {
    const next = {
      samples: [],
      lastEmittedAt: params.previous.lastEmittedAt,
    };
    return { next, event: null, trail: [], progress: 0 };
  }

  const samples = [
    ...params.previous.samples.filter((sample) => params.now - sample.at <= config.windowMs),
    { ...params.point, at: params.now, confidence: params.confidence },
  ];
  const trail = samples.map(({ x, y }) => ({ x, y }));

  if (samples.length < 8) {
    return {
      next: { ...params.previous, samples },
      event: null,
      trail,
      progress: 0,
    };
  }

  const durationMs = samples[samples.length - 1]!.at - samples[0]!.at;
  const metrics = circleMetrics(samples);
  const progress = Math.min(1, Math.abs(metrics.totalAngleRad) / config.minTotalAngleRad);
  const inCooldown =
    params.previous.lastEmittedAt != null &&
    params.now - params.previous.lastEmittedAt < config.cooldownMs;

  if (
    inCooldown ||
    durationMs < config.minDurationMs ||
    metrics.radiusPx < config.minRadiusPx ||
    metrics.radiusDeviationRatio > config.maxRadiusDeviationRatio ||
    metrics.confidence < config.minConfidence ||
    Math.abs(metrics.totalAngleRad) < config.minTotalAngleRad
  ) {
    return {
      next: { ...params.previous, samples },
      event: null,
      trail,
      progress,
    };
  }

  const direction: AIPilotPlusCircleDirection =
    metrics.totalAngleRad > 0 ? "clockwise" : "counterclockwise";

  return {
    next: {
      samples: [],
      lastEmittedAt: params.now,
    },
    event: {
      type: "circle",
      direction,
      center: metrics.center,
      radiusPx: metrics.radiusPx,
      totalAngleRad: metrics.totalAngleRad,
      confidence: metrics.confidence,
    },
    trail,
    progress: 1,
  };
}
