import { distance2 } from "../air-control/geometry";
import type {
  AIPilotPlusConfig,
  AIPilotPlusFrame,
  AIPilotPlusPoint,
  AIPilotPlusVector,
} from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getAIPilotPlusVectorDelta(
  previous: AIPilotPlusVector | null,
  current: AIPilotPlusVector | null,
): AIPilotPlusVector | null {
  if (!previous || !current) return null;
  return {
    x: current.x - previous.x,
    y: current.y - previous.y,
  };
}

export function getAIPilotPlusMagnitude(vector: AIPilotPlusVector | null): number {
  if (!vector) return 0;
  return Math.hypot(vector.x, vector.y);
}

export type DetectLockedIndexTapInput = {
  baseline: AIPilotPlusVector | null;
  previous: AIPilotPlusVector | null;
  current: AIPilotPlusVector | null;
  config: AIPilotPlusConfig;
};

export type LockedIndexTapDetection = {
  selected: boolean;
  score: number;
  travelPx: number;
  flickPx: number;
};

export function detectLockedIndexTap(
  input: DetectLockedIndexTapInput,
): LockedIndexTapDetection {
  const travelPx = getAIPilotPlusMagnitude(
    getAIPilotPlusVectorDelta(input.baseline, input.current),
  );
  const flickPx = getAIPilotPlusMagnitude(
    getAIPilotPlusVectorDelta(input.previous, input.current),
  );

  const travelScore =
    input.config.lockedTapTravelPx <= 0
      ? 0
      : travelPx / input.config.lockedTapTravelPx;
  const flickScore =
    input.config.lockedTapFlickPx <= 0 ? 0 : flickPx / input.config.lockedTapFlickPx;
  const score = Math.max(travelScore, flickScore);

  return {
    selected:
      travelPx >= input.config.lockedTapTravelPx ||
      flickPx >= input.config.lockedTapFlickPx,
    score,
    travelPx,
    flickPx,
  };
}

export type TwoHandZoomDetection = {
  center: AIPilotPlusPoint;
  scaleDelta: number;
  distanceDeltaPx: number;
};

export function detectTwoHandZoom(params: {
  previous: AIPilotPlusFrame | null;
  current: AIPilotPlusFrame;
  config: AIPilotPlusConfig;
}): TwoHandZoomDetection | null {
  const previousPrimary = params.previous?.palm;
  const previousSecondary = params.previous?.secondaryPalm;
  const currentPrimary = params.current.palm;
  const currentSecondary = params.current.secondaryPalm;

  if (!previousPrimary || !previousSecondary || !currentPrimary || !currentSecondary) {
    return null;
  }

  const previousDistance = distance2(previousPrimary, previousSecondary);
  const currentDistance = distance2(currentPrimary, currentSecondary);
  const distanceDeltaPx = currentDistance - previousDistance;

  if (Math.abs(distanceDeltaPx) < params.config.zoomDeadzonePx) {
    return null;
  }

  return {
    center: {
      x: (currentPrimary.x + currentSecondary.x) / 2,
      y: (currentPrimary.y + currentSecondary.y) / 2,
    },
    scaleDelta: clamp(
      distanceDeltaPx * params.config.zoomScale,
      -params.config.zoomMaxScaleDelta,
      params.config.zoomMaxScaleDelta,
    ),
    distanceDeltaPx,
  };
}
