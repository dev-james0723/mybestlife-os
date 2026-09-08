import { describe, expect, it } from "vitest";

import { radiusAfterPinch, radiusToZoomPercent } from "./sphereFocusZoom";

describe("sphere pinch zoom", () => {
  it("moves closer when fingers spread in either orbit", () => {
    for (const radius of [600, 120]) {
      const closer = radiusAfterPinch(radius, 50, 150);
      expect(closer).toBeCloseTo(radius / 3);
      expect(radiusToZoomPercent(closer, 10, 1000)).toBeGreaterThan(radiusToZoomPercent(radius, 10, 1000));
    }
  });

  it("moves farther when fingers come together and reverses the gesture", () => {
    const farther = radiusAfterPinch(200, 150, 50);
    expect(farther).toBe(600);
    expect(radiusAfterPinch(farther, 50, 150)).toBe(200);
  });

  it("ignores invalid spans without producing an infinite camera radius", () => {
    for (const span of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(radiusAfterPinch(200, 50, span)).toBe(200);
      expect(radiusAfterPinch(200, span, 50)).toBe(200);
    }
  });
});
