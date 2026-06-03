import { describe, expect, it } from "vitest";
import {
  clampToViewport,
  confidenceScore,
  fitPlane,
  pointInHitbox,
  pointPlaneDistance,
  project3DToCSS,
  rayPlaneIntersection,
  screenBasisFromCorners,
  vec3,
  type Plane,
} from "./geometry";

const xyPlane: Plane = { point: vec3(0, 0, 0), normal: vec3(0, 0, 1) };

describe("rayPlaneIntersection", () => {
  it("hits a plane straight on", () => {
    const hit = rayPlaneIntersection(vec3(2, 3, 5), vec3(0, 0, -1), xyPlane);
    expect(hit).not.toBeNull();
    expect(hit?.point.x).toBeCloseTo(2);
    expect(hit?.point.y).toBeCloseTo(3);
    expect(hit?.point.z).toBeCloseTo(0);
    expect(hit?.t).toBeCloseTo(5);
  });

  it("returns null when the ray is parallel to the plane", () => {
    expect(rayPlaneIntersection(vec3(0, 0, 5), vec3(1, 0, 0), xyPlane)).toBeNull();
  });

  it("returns null when the intersection is behind the origin", () => {
    // pointing away from the plane (+z) while sitting in front of it
    expect(rayPlaneIntersection(vec3(0, 0, 5), vec3(0, 0, 1), xyPlane)).toBeNull();
  });
});

describe("pointPlaneDistance", () => {
  it("is signed along the normal", () => {
    expect(pointPlaneDistance(vec3(0, 0, 4), xyPlane)).toBeCloseTo(4);
    expect(pointPlaneDistance(vec3(0, 0, -4), xyPlane)).toBeCloseTo(-4);
  });
});

describe("fitPlane", () => {
  it("recovers the z=0 plane normal from coplanar points", () => {
    const plane = fitPlane([vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0), vec3(1, 1, 0)]);
    expect(plane).not.toBeNull();
    // normal should be parallel to +/- z
    expect(Math.abs(plane!.normal.z)).toBeCloseTo(1);
    expect(Math.abs(plane!.normal.x)).toBeCloseTo(0);
    expect(Math.abs(plane!.normal.y)).toBeCloseTo(0);
  });

  it("returns null with fewer than three points", () => {
    expect(fitPlane([vec3(0, 0, 0), vec3(1, 1, 1)])).toBeNull();
  });
});

describe("screenBasisFromCorners + project3DToCSS", () => {
  it("maps corners to viewport extremes", () => {
    const basis = screenBasisFromCorners(vec3(0, 0, 0), vec3(2, 0, 0), vec3(0, 1, 0));
    const viewport = { width: 800, height: 600 };
    expect(project3DToCSS(vec3(0, 0, 0), basis, viewport)).toEqual({ x: 0, y: 0 });
    const br = project3DToCSS(vec3(2, 1, 0), basis, viewport);
    expect(br.x).toBeCloseTo(800);
    expect(br.y).toBeCloseTo(600);
    const center = project3DToCSS(vec3(1, 0.5, 0), basis, viewport);
    expect(center.x).toBeCloseTo(400);
    expect(center.y).toBeCloseTo(300);
  });
});

describe("clampToViewport", () => {
  it("clamps inside with a margin", () => {
    const vp = { width: 100, height: 100 };
    expect(clampToViewport({ x: -10, y: 200 }, vp, 5)).toEqual({ x: 5, y: 95 });
    expect(clampToViewport({ x: 50, y: 50 }, vp, 5)).toEqual({ x: 50, y: 50 });
  });
});

describe("pointInHitbox", () => {
  const box = { x: 100, y: 100, width: 50, height: 50 };

  it("detects points inside the raw box", () => {
    expect(pointInHitbox({ x: 120, y: 120 }, box)).toBe(true);
    expect(pointInHitbox({ x: 200, y: 200 }, box)).toBe(false);
  });

  it("respects the padding ring", () => {
    // 30px outside the right edge, within a 36px padding
    expect(pointInHitbox({ x: 180, y: 125 }, box, 36)).toBe(true);
    // 40px outside, beyond padding
    expect(pointInHitbox({ x: 190, y: 125 }, box, 36)).toBe(false);
  });
});

describe("confidenceScore", () => {
  it("returns 0 for empty input", () => {
    expect(confidenceScore([])).toBe(0);
  });

  it("is the geometric mean and punishes weak factors", () => {
    expect(confidenceScore([1, 1])).toBeCloseTo(1);
    expect(confidenceScore([1, 0.25])).toBeCloseTo(0.5);
    expect(confidenceScore([0.9, 0])).toBe(0);
  });
});
