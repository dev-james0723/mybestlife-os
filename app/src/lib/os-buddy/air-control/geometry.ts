/**
 * Pure geometry primitives for OSBuddy Air Touch / Air Grab.
 *
 * Everything here is deterministic, framework-free and unit-testable. The true-3D
 * math (ray-plane intersection, plane fitting, screen-basis projection) lives here
 * but stays dormant until a calibrated screen plane and a usable 3D source exist.
 * Single-RGB Air Touch only uses the 2D helpers (clampToViewport, pointInHitbox).
 */

export type Vec2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };

/** A plane defined by a point on it and a unit normal. */
export type Plane = { point: Vec3; normal: Vec3 };

/** Local coordinate frame of the screen, derived from three corners. */
export type ScreenBasis = {
  origin: Vec3; // top-left corner
  right: Vec3; // unit axis towards top-right (one CSS px of width = `widthLen` world units)
  down: Vec3; // unit axis towards bottom-left (one CSS px of height = `heightLen` world units)
  normal: Vec3;
  widthLen: number; // world-space length of the top edge
  heightLen: number; // world-space length of the left edge
};

const EPSILON = 1e-9;

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(a: Vec3): number {
  return Math.sqrt(dot(a, a));
}

export function normalize(a: Vec3): Vec3 {
  const len = length(a);
  if (len < EPSILON) return { x: 0, y: 0, z: 0 };
  return scale(a, 1 / len);
}

export function distance3(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

export function distance2(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Intersect a ray (origin + t*direction, t >= 0) with a plane.
 * Returns the intersection point and the ray parameter `t`, or null when the ray
 * is parallel to the plane or the hit is behind the origin.
 */
export function rayPlaneIntersection(
  origin: Vec3,
  direction: Vec3,
  plane: Plane,
): { point: Vec3; t: number } | null {
  const dir = normalize(direction);
  const denom = dot(dir, plane.normal);
  if (Math.abs(denom) < EPSILON) return null; // parallel

  const t = dot(sub(plane.point, origin), plane.normal) / denom;
  if (t < 0) return null; // behind the ray origin

  return { point: add(origin, scale(dir, t)), t };
}

/** Signed distance from a point to a plane (sign follows the plane normal). */
export function pointPlaneDistance(point: Vec3, plane: Plane): number {
  return dot(sub(point, plane.point), normalize(plane.normal));
}

/**
 * Least-squares plane fit through 3D samples (centroid + covariance smallest
 * eigenvector via power iteration on the inverse). Returns null for < 3 points.
 */
export function fitPlane(points: Vec3[]): Plane | null {
  if (points.length < 3) return null;

  const centroid = points.reduce((acc, p) => add(acc, p), vec3(0, 0, 0));
  const n = points.length;
  const c = scale(centroid, 1 / n);

  // Covariance matrix (symmetric 3x3).
  let xx = 0;
  let xy = 0;
  let xz = 0;
  let yy = 0;
  let yz = 0;
  let zz = 0;
  for (const p of points) {
    const r = sub(p, c);
    xx += r.x * r.x;
    xy += r.x * r.y;
    xz += r.x * r.z;
    yy += r.y * r.y;
    yz += r.y * r.z;
    zz += r.z * r.z;
  }

  // The plane normal is the eigenvector of the smallest eigenvalue. We obtain it
  // from the cross products of the covariance rows (robust for well-conditioned
  // point sets), picking the largest-magnitude candidate.
  const rowX = vec3(xx, xy, xz);
  const rowY = vec3(xy, yy, yz);
  const rowZ = vec3(xz, yz, zz);
  const candidates = [cross(rowX, rowY), cross(rowY, rowZ), cross(rowZ, rowX)];
  let best = candidates[0];
  let bestLen = length(best);
  for (const cand of candidates) {
    const len = length(cand);
    if (len > bestLen) {
      best = cand;
      bestLen = len;
    }
  }
  if (bestLen < EPSILON) return null;

  return { point: c, normal: normalize(best) };
}

/**
 * Build a screen coordinate frame from three calibrated corners (world coords).
 * topLeft -> topRight defines the +x (right) axis; topLeft -> bottomLeft defines
 * the +y (down) axis. Normal = right x down.
 */
export function screenBasisFromCorners(
  topLeft: Vec3,
  topRight: Vec3,
  bottomLeft: Vec3,
): ScreenBasis {
  const rightVec = sub(topRight, topLeft);
  const downVec = sub(bottomLeft, topLeft);
  const widthLen = length(rightVec);
  const heightLen = length(downVec);
  const right = normalize(rightVec);
  const down = normalize(downVec);
  const normal = normalize(cross(right, down));
  return { origin: topLeft, right, down, normal, widthLen, heightLen };
}

/**
 * Project a 3D point that lies on (or near) the screen plane to CSS pixel coords.
 * Uses the screen basis to find how far along the right/down axes the point sits,
 * then scales by the viewport size.
 */
export function project3DToCSS(
  point: Vec3,
  basis: ScreenBasis,
  viewport: { width: number; height: number },
): Vec2 {
  const rel = sub(point, basis.origin);
  const along = dot(rel, basis.right); // world units along width
  const down = dot(rel, basis.down); // world units along height
  const u = basis.widthLen < EPSILON ? 0 : along / basis.widthLen;
  const v = basis.heightLen < EPSILON ? 0 : down / basis.heightLen;
  return { x: u * viewport.width, y: v * viewport.height };
}

/** Clamp a CSS point inside the viewport, keeping a margin from each edge. */
export function clampToViewport(
  point: Vec2,
  viewport: { width: number; height: number },
  margin = 0,
): Vec2 {
  const maxX = Math.max(margin, viewport.width - margin);
  const maxY = Math.max(margin, viewport.height - margin);
  return {
    x: Math.min(Math.max(point.x, margin), maxX),
    y: Math.min(Math.max(point.y, margin), maxY),
  };
}

export type Hitbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Whether a CSS point falls inside a hitbox expanded by `padding` on each side.
 * This is the fingertip-proximity test that drives Air Touch (NOT a pointing ray).
 */
export function pointInHitbox(point: Vec2, box: Hitbox, padding = 0): boolean {
  return (
    point.x >= box.x - padding &&
    point.x <= box.x + box.width + padding &&
    point.y >= box.y - padding &&
    point.y <= box.y + box.height + padding
  );
}

/**
 * Combine independent confidence factors (each in 0..1) into a single score.
 * Missing/empty factors yield 0. Uses the geometric mean so any weak factor
 * meaningfully lowers the result.
 */
export function confidenceScore(factors: number[]): number {
  if (factors.length === 0) return 0;
  let product = 1;
  for (const f of factors) {
    product *= Math.min(1, Math.max(0, f));
  }
  return Math.pow(product, 1 / factors.length);
}
