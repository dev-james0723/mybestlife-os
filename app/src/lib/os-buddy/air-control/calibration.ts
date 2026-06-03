/**
 * Screen-plane calibration data model + pure quality scoring + a least-squares
 * affine solver for the 9-point desktop touch calibration.
 *
 * The affine solver is pure JS and fully testable; it maps a normalized image
 * point to CSS coordinates (good enough for single-camera 2D calibration). The
 * heavier projective solvers (homography, phone-corner PnP, stereo) lazy-load
 * OpenCV.js ONLY inside their own solve functions (Phase 8) so the runtime hot
 * path never pulls it in.
 */

import type { CalibrationData } from "./types";
import type { OSBuddyAirControlQuality } from "../os-buddy-air-control-types";

export type Point2 = { x: number; y: number };
/** Affine [a,b,c,d,e,f]: x' = a*x + b*y + c, y' = d*x + e*y + f. */
export type Affine = [number, number, number, number, number, number];

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

export function applyAffine(affine: Affine, point: Point2): Point2 {
  const [a, b, c, d, e, f] = affine;
  return { x: a * point.x + b * point.y + c, y: d * point.x + e * point.y + f };
}

/** Invert a symmetric positive-definite 3x3 matrix; null if singular. */
function invert3(m: number[][]): number[][] | null {
  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  return [
    [(e * i - f * h) * inv, (c * h - b * i) * inv, (b * f - c * e) * inv],
    [(f * g - d * i) * inv, (a * i - c * g) * inv, (c * d - a * f) * inv],
    [(d * h - e * g) * inv, (b * g - a * h) * inv, (a * e - b * d) * inv],
  ];
}

/**
 * Least-squares affine fit from src (normalized image) -> dst (CSS) point pairs.
 * Solves the normal equations (AᵀA)⁻¹Aᵀb separately for x' and y'. Needs >= 3
 * non-collinear correspondences. Returns null when the system is singular.
 */
export function solveAffineMapping(
  pairs: Array<{ src: Point2; dst: Point2 }>,
): Affine | null {
  if (pairs.length < 3) return null;

  // Normal matrix N = AᵀA where each row of A is [x, y, 1].
  const N = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const bx = [0, 0, 0];
  const by = [0, 0, 0];
  for (const { src, dst } of pairs) {
    const r = [src.x, src.y, 1];
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) N[i][j] += r[i] * r[j];
      bx[i] += r[i] * dst.x;
      by[i] += r[i] * dst.y;
    }
  }

  const Ninv = invert3(N);
  if (!Ninv) return null;

  const mul = (v: number[]) => [
    Ninv[0][0] * v[0] + Ninv[0][1] * v[1] + Ninv[0][2] * v[2],
    Ninv[1][0] * v[0] + Ninv[1][1] * v[1] + Ninv[1][2] * v[2],
    Ninv[2][0] * v[0] + Ninv[2][1] * v[1] + Ninv[2][2] * v[2],
  ];
  const [a, b, c] = mul(bx);
  const [d, e, f] = mul(by);
  return [a, b, c, d, e, f];
}

/**
 * Solve a desktop touch calibration from samples pairing a normalized image
 * fingertip with the on-screen target it touched. Produces a persistable
 * {@link CalibrationData} with an affine mapping, RMS error and quality.
 */
export function solveScreenPlaneFrom9Points(params: {
  samples: Array<{ imagePoint: Point2; screenPoint: Point2 }>;
  screenCssSize: { width: number; height: number };
  device?: string | null;
}): CalibrationData {
  const { samples, screenCssSize } = params;
  const pairs = samples.map((s) => ({ src: s.imagePoint, dst: s.screenPoint }));
  const affine = solveAffineMapping(pairs);

  if (!affine) {
    return { ...identityCalibration(screenCssSize), device: params.device ?? null };
  }

  const predicted = samples.map((s) => applyAffine(affine, s.imagePoint));
  const observed = samples.map((s) => s.screenPoint);
  const rms = reprojectionRmsError(observed, predicted);

  return {
    createdAt: Date.now(),
    screenCssSize,
    quality: qualityFromRms(rms),
    rmsErrorPx: rms,
    mapping: { sourceId: "rgb-webcam", affine },
    device: params.device ?? null,
  };
}
