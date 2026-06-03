/**
 * Stereo triangulation (PURE).
 *
 * Given two 3x4 camera projection matrices and a matched image observation in
 * each, recover the 3D point via the inhomogeneous Direct Linear Transform. This
 * is the small runtime-friendly core used by the stereo provider; full OpenCV.js
 * (stereoCalibrate / calibrateCamera) is only ever used in the calibration setup
 * flow to PRODUCE the projection matrices, never per frame.
 */

import type { Vec2, Vec3 } from "./geometry";

/** Row-major 3x4 projection matrix. */
export type ProjectionMatrix = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

function row(P: ProjectionMatrix, r: 0 | 1 | 2): [number, number, number, number] {
  const o = r * 4;
  return [P[o], P[o + 1], P[o + 2], P[o + 3]];
}

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
 * Triangulate a 3D point from two views. Returns null if the system is singular.
 *
 * Each view contributes two equations:
 *   (x * P2row - P0row) · X = 0
 *   (y * P2row - P1row) · X = 0
 * with X = (X, Y, Z, 1). Stacking the 4 equations gives A·[X Y Z]ᵀ = b, solved
 * via the normal equations (least squares).
 */
export function triangulateDLT(
  P1: ProjectionMatrix,
  P2: ProjectionMatrix,
  x1: Vec2,
  x2: Vec2,
): Vec3 | null {
  const rows: number[][] = [];
  const rhs: number[] = [];

  const addView = (P: ProjectionMatrix, p: Vec2) => {
    const r0 = row(P, 0);
    const r1 = row(P, 1);
    const r2 = row(P, 2);
    // (p.x * r2 - r0): coeffs for X,Y,Z and constant moved to rhs
    rows.push([p.x * r2[0] - r0[0], p.x * r2[1] - r0[1], p.x * r2[2] - r0[2]]);
    rhs.push(-(p.x * r2[3] - r0[3]));
    rows.push([p.y * r2[0] - r1[0], p.y * r2[1] - r1[1], p.y * r2[2] - r1[2]]);
    rhs.push(-(p.y * r2[3] - r1[3]));
  };

  addView(P1, x1);
  addView(P2, x2);

  // Normal equations: (AᵀA) X = Aᵀ b
  const N = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const b = [0, 0, 0];
  for (let k = 0; k < rows.length; k += 1) {
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) N[i][j] += rows[k][i] * rows[k][j];
      b[i] += rows[k][i] * rhs[k];
    }
  }

  const Ninv = invert3(N);
  if (!Ninv) return null;
  return {
    x: Ninv[0][0] * b[0] + Ninv[0][1] * b[1] + Ninv[0][2] * b[2],
    y: Ninv[1][0] * b[0] + Ninv[1][1] * b[1] + Ninv[1][2] * b[2],
    z: Ninv[2][0] * b[0] + Ninv[2][1] * b[1] + Ninv[2][2] * b[2],
  };
}

/** Project a 3D point with a projection matrix to image coords (for tests/quality). */
export function projectPoint(P: ProjectionMatrix, X: Vec3): Vec2 | null {
  const r0 = row(P, 0);
  const r1 = row(P, 1);
  const r2 = row(P, 2);
  const w = r2[0] * X.x + r2[1] * X.y + r2[2] * X.z + r2[3];
  if (Math.abs(w) < 1e-12) return null;
  return {
    x: (r0[0] * X.x + r0[1] * X.y + r0[2] * X.z + r0[3]) / w,
    y: (r1[0] * X.x + r1[1] * X.y + r1[2] * X.z + r1[3]) / w,
  };
}
