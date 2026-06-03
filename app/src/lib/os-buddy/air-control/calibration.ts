/**
 * Screen-plane calibration data model + pure quality scoring.
 *
 * Phase 1 provides the data model and the scoring/threshold helpers (fully
 * testable). The heavy solvers (9-point homography, phone-corner PnP, stereo)
 * are added in Phase 5 and lazy-load OpenCV.js ONLY inside their solve functions
 * so the runtime hot path never pulls it in.
 */

import type { CalibrationData } from "./types";
import type { OSBuddyAirControlQuality } from "../os-buddy-air-control-types";

/** Practical reprojection-error thresholds in CSS pixels. */
export const CALIBRATION_RMS_GOOD_PX = 15;
export const CALIBRATION_RMS_OK_PX = 40;

export function qualityFromRms(rmsErrorPx: number | null): OSBuddyAirControlQuality {
  if (rmsErrorPx == null || !Number.isFinite(rmsErrorPx)) return "uncalibrated";
  if (rmsErrorPx <= CALIBRATION_RMS_GOOD_PX) return "good";
  if (rmsErrorPx <= CALIBRATION_RMS_OK_PX) return "ok";
  return "poor";
}

/** An uncalibrated baseline (2D fallback only). */
export function identityCalibration(screenCssSize: {
  width: number;
  height: number;
}): CalibrationData {
  return {
    createdAt: Date.now(),
    screenCssSize,
    quality: "uncalibrated",
    rmsErrorPx: null,
    mapping: null,
    device: null,
  };
}

/**
 * RMS reprojection error in pixels between observed and predicted screen points.
 * Used by every calibration solver to score its fit.
 */
export function reprojectionRmsError(
  observed: Array<{ x: number; y: number }>,
  predicted: Array<{ x: number; y: number }>,
): number | null {
  const n = Math.min(observed.length, predicted.length);
  if (n === 0) return null;
  let sumSq = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = observed[i].x - predicted[i].x;
    const dy = observed[i].y - predicted[i].y;
    sumSq += dx * dx + dy * dy;
  }
  return Math.sqrt(sumSq / n);
}

/** Whether a calibration is usable as a true-3D / calibrated source. */
export function isUsableCalibration(data: CalibrationData | null): boolean {
  return data != null && data.quality !== "uncalibrated" && data.quality !== "poor";
}

/** A compact summary safe to persist (numbers only, no frames). */
export function summarizeCalibration(data: CalibrationData | null): {
  quality: OSBuddyAirControlQuality;
  rmsErrorPx: number | null;
  createdAt: number | null;
} {
  if (!data) return { quality: "uncalibrated", rmsErrorPx: null, createdAt: null };
  return {
    quality: data.quality,
    rmsErrorPx: data.rmsErrorPx,
    createdAt: data.createdAt,
  };
}
