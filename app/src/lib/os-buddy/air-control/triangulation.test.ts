import { describe, expect, it } from "vitest";
import {
  projectPoint,
  triangulateDLT,
  type ProjectionMatrix,
} from "./triangulation";
import { vec3 } from "./geometry";

// Camera 1 at origin looking down +z (pinhole, focal 1).
const P1: ProjectionMatrix = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
];
// Camera 2 translated along +x by 1 unit.
const P2: ProjectionMatrix = [
  1, 0, 0, -1,
  0, 1, 0, 0,
  0, 0, 1, 0,
];

describe("triangulateDLT", () => {
  it("recovers a known 3D point from two projections", () => {
    const truth = vec3(0.4, -0.2, 5);
    const x1 = projectPoint(P1, truth)!;
    const x2 = projectPoint(P2, truth)!;
    const recovered = triangulateDLT(P1, P2, x1, x2);
    expect(recovered).not.toBeNull();
    expect(recovered!.x).toBeCloseTo(truth.x, 4);
    expect(recovered!.y).toBeCloseTo(truth.y, 4);
    expect(recovered!.z).toBeCloseTo(truth.z, 4);
  });

  it("recovers several points", () => {
    for (const truth of [vec3(1, 1, 3), vec3(-2, 0.5, 8), vec3(0, 0, 4)]) {
      const x1 = projectPoint(P1, truth)!;
      const x2 = projectPoint(P2, truth)!;
      const r = triangulateDLT(P1, P2, x1, x2)!;
      expect(r.x).toBeCloseTo(truth.x, 3);
      expect(r.y).toBeCloseTo(truth.y, 3);
      expect(r.z).toBeCloseTo(truth.z, 3);
    }
  });

  it("returns null for degenerate identical cameras", () => {
    // Two identical cameras cannot triangulate depth -> singular system.
    const truth = vec3(0, 0, 5);
    const x = projectPoint(P1, truth)!;
    expect(triangulateDLT(P1, P1, x, x)).toBeNull();
  });
});
