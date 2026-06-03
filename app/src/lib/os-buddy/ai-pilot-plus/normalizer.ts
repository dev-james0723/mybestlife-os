import type { AirTouchReading } from "../air-control/types";
import {
  getIndexTipPoint,
  mapNormalizedPointToViewport,
  resolveAirControlGesture,
} from "../os-buddy-air-gestures";
import type {
  OSBuddyAirControlHand,
  OSBuddyAirControlLandmark,
  OSBuddyAirControlPoint,
  OSBuddyAirControlSensorMode,
} from "../os-buddy-air-control-types";
import type { AIPilotPlusFrame, AIPilotPlusTarget } from "./types";

const PALM_LANDMARKS = [0, 5, 9, 13, 17] as const;

export type NormalizeAIPilotPlusFrameInput = {
  active: boolean;
  now: number;
  viewport: { width: number; height: number };
  reading?: AirTouchReading | null;
  primaryHand?: OSBuddyAirControlHand | null;
  secondaryHand?: OSBuddyAirControlHand | null;
  rawCursor?: OSBuddyAirControlPoint | null;
  rawPalmCursor?: OSBuddyAirControlPoint | null;
  target?: AIPilotPlusTarget | null;
  lockedTarget?: AIPilotPlusTarget | null;
  sensorMode?: OSBuddyAirControlSensorMode;
  mirrored?: boolean;
};

function averageLandmarks(
  hand: OSBuddyAirControlHand | null | undefined,
  indexes: readonly number[],
): OSBuddyAirControlLandmark | null {
  if (!hand) return null;

  const usable = indexes
    .map((index) => hand.landmarks[index])
    .filter((point): point is OSBuddyAirControlLandmark => point != null);

  if (usable.length === 0) return null;

  return {
    x: usable.reduce((sum, point) => sum + point.x, 0) / usable.length,
    y: usable.reduce((sum, point) => sum + point.y, 0) / usable.length,
    z:
      usable.some((point) => point.z != null)
        ? usable.reduce((sum, point) => sum + (point.z ?? 0), 0) / usable.length
        : undefined,
  };
}

function mapLandmarkToViewport(params: {
  point: OSBuddyAirControlLandmark | null;
  viewport: { width: number; height: number };
  mirrored: boolean;
}): OSBuddyAirControlPoint | null {
  if (!params.point || params.viewport.width <= 0 || params.viewport.height <= 0) {
    return null;
  }

  return mapNormalizedPointToViewport({
    point: params.point,
    viewport: params.viewport,
    mirrored: params.mirrored,
  });
}

export function getAIPilotPlusPalmCenter(
  hand: OSBuddyAirControlHand | null | undefined,
): OSBuddyAirControlLandmark | null {
  return averageLandmarks(hand, PALM_LANDMARKS);
}

export function getAIPilotPlusIndexPalmVector(params: {
  index: OSBuddyAirControlPoint | null;
  palm: OSBuddyAirControlPoint | null;
}): OSBuddyAirControlPoint | null {
  if (!params.index || !params.palm) return null;
  return {
    x: params.index.x - params.palm.x,
    y: params.index.y - params.palm.y,
  };
}

export function normalizeAIPilotPlusFrame(
  input: NormalizeAIPilotPlusFrameInput,
): AIPilotPlusFrame {
  const mirrored = input.mirrored ?? true;
  const primaryHand = input.primaryHand ?? null;
  const secondaryHand = input.secondaryHand ?? null;
  const reading = input.reading ?? null;

  const inferredIndex = mapLandmarkToViewport({
    point: primaryHand ? getIndexTipPoint(primaryHand) : null,
    viewport: input.viewport,
    mirrored,
  });
  const rawCursor = input.rawCursor ?? reading?.fingertip ?? inferredIndex;
  const cursor = reading?.fingertip ?? rawCursor;
  const palm =
    input.rawPalmCursor ??
    mapLandmarkToViewport({
      point: getAIPilotPlusPalmCenter(primaryHand),
      viewport: input.viewport,
      mirrored,
    });
  const secondaryPalm = mapLandmarkToViewport({
    point: getAIPilotPlusPalmCenter(secondaryHand),
    viewport: input.viewport,
    mirrored,
  });

  return {
    now: input.now,
    active: input.active,
    handCount:
      (primaryHand ? 1 : 0) + (secondaryHand ? 1 : 0),
    gesture:
      reading?.gesture ??
      (primaryHand ? resolveAirControlGesture(primaryHand) : "None"),
    confidence: reading?.confidence ?? primaryHand?.confidence ?? 0,
    sensorMode: input.sensorMode ?? reading?.sensorMode ?? "rgb-webcam",
    cursor,
    rawCursor,
    palm,
    indexPalmVector: getAIPilotPlusIndexPalmVector({
      index: rawCursor,
      palm,
    }),
    primaryHand,
    secondaryHand,
    secondaryPalm,
    target: input.target ?? null,
    lockedTarget: input.lockedTarget ?? null,
  };
}
