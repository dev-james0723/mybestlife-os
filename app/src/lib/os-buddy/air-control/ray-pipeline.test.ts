import { describe, expect, it } from "vitest";
import { screenBasisFromCorners, vec3, type Plane } from "./geometry";
import {
  estimateFingerRay,
  fingertipScreenPositionFrom3D,
  rayScreenPositionFrom3D,
} from "./ray-pipeline";

// A 800x600 screen lying on the z=0 plane, 2 world units wide, 1.5 tall.
const basis = screenBasisFromCorners(vec3(0, 0, 0), vec3(2, 0, 0), vec3(0, 1.5, 0));
const plane: Plane = { point: vec3(0, 0, 0), normal: vec3(0, 0, 1) };
const viewport = { width: 800, height: 600 };

describe("estimateFingerRay", () => {
  it("points from the fingertip outward", () => {
    const landmarks = new Array(21).fill(null).map(() => vec3(0, 0, 0));
    landmarks[5] = vec3(0, 0, 1); // mcp
    landmarks[6] = vec3(0, 0, 0.7);
    landmarks[7] = vec3(0, 0, 0.4);
    landmarks[8] = vec3(0, 0, 0.1); // tip, advancing toward the screen (-z)
    const ray = estimateFingerRay(landmarks);
    expect(ray).not.toBeNull();
    expect(ray!.origin).toEqual(vec3(0, 0, 0.1));
    expect(ray!.direction.z).toBeLessThan(0); // heading toward the screen
  });

  it("returns null without index landmarks", () => {
    expect(estimateFingerRay([])).toBeNull();
  });
});

describe("fingertipScreenPositionFrom3D", () => {
  it("projects a fingertip in front of the screen to CSS", () => {
    // fingertip above the screen centre, 0.3 units in front (z=0.3)
    const proj = fingertipScreenPositionFrom3D({
      fingertip3D: vec3(1, 0.75, 0.3),
      basis,
      plane,
      viewport,
    });
    expect(proj).not.toBeNull();
    expect(proj!.point.x).toBeCloseTo(400);
    expect(proj!.point.y).toBeCloseTo(300);
    expect(proj!.confidence).toBeGreaterThan(0);
    expect(proj!.confidence).toBeLessThanOrEqual(1);
  });

  it("rejects points too far from the plane", () => {
    const proj = fingertipScreenPositionFrom3D({
      fingertip3D: vec3(1, 0.75, 5),
      basis,
      plane,
      viewport,
      maxDistanceUnits: 1,
    });
    expect(proj).toBeNull();
  });
});

describe("rayScreenPositionFrom3D", () => {
  it("casts a forward ray onto the screen", () => {
    const proj = rayScreenPositionFrom3D({
      ray: { origin: vec3(1, 0.75, 1), direction: vec3(0, 0, -1) },
      basis,
      plane,
      viewport,
    });
    expect(proj).not.toBeNull();
    expect(proj!.point.x).toBeCloseTo(400);
    expect(proj!.point.y).toBeCloseTo(300);
  });

  it("returns null for a ray parallel to the screen", () => {
    const proj = rayScreenPositionFrom3D({
      ray: { origin: vec3(1, 0.75, 1), direction: vec3(1, 0, 0) },
      basis,
      plane,
      viewport,
    });
    expect(proj).toBeNull();
  });

  it("returns null when the hit is far outside the viewport", () => {
    const proj = rayScreenPositionFrom3D({
      ray: { origin: vec3(10, 0.75, 1), direction: vec3(0, 0, -1) },
      basis,
      plane,
      viewport,
      maxOutsideFactor: 0.5,
    });
    expect(proj).toBeNull();
  });
});
