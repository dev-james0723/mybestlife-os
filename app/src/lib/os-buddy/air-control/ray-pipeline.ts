/**
 * Layer 2 (3D) — true-3D fingertip pipeline (PURE).
 *
 * This is the line between "3D" and "2D fallback": it only produces a result when
 * a calibrated screen plane/basis AND a usable 3D hand point (from depth / stereo
 * triangulation / phone AR) are supplied. The resolver calls this only when the
 * calibration quality is usable; otherwise it stays on the 2D image-space path.
 *
 * Two strategies, both tested:
 *  - point projection: project the 3D fingertip onto the screen plane and convert
 *    to CSS. Preferred for Air Touch (we care where the fingertip is, not where it
 *    points).
 *  - ray casting: cast the index finger ray onto the screen plane (available for
 *    callers that want pointing semantics). Rejected when parallel / behind.
 */

import {
  add,
  clampToViewport,
  normalize,
  project3DToCSS,
  rayPlaneIntersection,
  scale,
  sub,
  type Plane,
  type ScreenBasis,
  type Vec2,
  type Vec3,
} from "./geometry";

const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_DIP = 7;
const INDEX_TIP = 8;

export type FingerRay = { origin: Vec3; direction: Vec3 };

/**
 * Robust index-finger ray from 3D landmarks: origin at the tip, direction the
 * average of the MCP->TIP and PIP->TIP vectors (less jittery than tip-MCP alone).
 */
export function estimateFingerRay(landmarks3D: Vec3[]): FingerRay | null {
  const mcp = landmarks3D[INDEX_MCP];
  const pip = landmarks3D[INDEX_PIP];
  const dip = landmarks3D[INDEX_DIP];
  const tip = landmarks3D[INDEX_TIP];
  if (!mcp || !pip || !dip || !tip) return null;

  const d1 = normalize(sub(tip, mcp));
  const d2 = normalize(sub(tip, pip));
  const direction = normalize(add(d1, d2));
  return { origin: tip, direction };
}

export type ScreenProjection = {
  point: Vec2;
  confidence: number;
};

/**
 * Project a 3D fingertip onto the calibrated screen and return CSS coords.
 * `maxBehindUnits` rejects points too far behind the screen plane (noise).
 */
export function fingertipScreenPositionFrom3D(params: {
  fingertip3D: Vec3;
  basis: ScreenBasis;
  plane: Plane;
  viewport: { width: number; height: number };
  maxDistanceUnits?: number;
}): ScreenProjection | null {
  const { fingertip3D, basis, plane, viewport } = params;
  const maxDistance = params.maxDistanceUnits ?? Number.POSITIVE_INFINITY;

  // Distance from the plane along the normal.
  const rel = sub(fingertip3D, plane.point);
  const along = dotN(rel, plane.normal);
  if (Math.abs(along) > maxDistance) return null;

  // Foot of the perpendicular onto the plane.
  const projected = sub(fingertip3D, scale(plane.normal, along));
  const css = project3DToCSS(projected, basis, viewport);

  // Confidence falls off with distance from the plane.
  const confidence = 1 / (1 + Math.abs(along));
  return { point: clampToViewport(css, viewport), confidence };
}

/**
 * Cast the index finger ray onto the screen plane. Returns null when the ray is
 * parallel, the hit is behind the finger, or far outside the viewport.
 */
export function rayScreenPositionFrom3D(params: {
  ray: FingerRay;
  basis: ScreenBasis;
  plane: Plane;
  viewport: { width: number; height: number };
  maxOutsideFactor?: number;
}): ScreenProjection | null {
  const { ray, basis, plane, viewport } = params;
  const maxOutside = params.maxOutsideFactor ?? 0.5;

  const hit = rayPlaneIntersection(ray.origin, ray.direction, plane);
  if (!hit) return null;

  const css = project3DToCSS(hit.point, basis, viewport);
  const marginX = viewport.width * maxOutside;
  const marginY = viewport.height * maxOutside;
  if (
    css.x < -marginX ||
    css.x > viewport.width + marginX ||
    css.y < -marginY ||
    css.y > viewport.height + marginY
  ) {
    return null;
  }

  const confidence = 1 / (1 + hit.t);
  return { point: clampToViewport(css, viewport), confidence };
}

function dotN(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
