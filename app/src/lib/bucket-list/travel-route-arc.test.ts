import { describe, expect, it } from "vitest";

import {
  buildFlightArcPoints,
  positionOnArc,
  progressFromLatLng,
} from "./travel-route-arc";

describe("travel-route-arc", () => {
  const nyc = { lat: 40.7128, lng: -74.006 };
  const kef = { lat: 64.1466, lng: -21.9426 };

  it("builds a curved path with more than two points", () => {
    const arc = buildFlightArcPoints(nyc, kef, 32);
    expect(arc.length).toBeGreaterThan(2);
    expect(arc[0]).toEqual([nyc.lat, nyc.lng]);
    expect(arc[arc.length - 1]).toEqual([kef.lat, kef.lng]);
  });

  it("maps progress 0 and 1 to endpoints", () => {
    const arc = buildFlightArcPoints(nyc, kef, 40);
    const start = positionOnArc(arc, 0);
    const end = positionOnArc(arc, 1);
    expect(start.lat).toBeCloseTo(nyc.lat, 1);
    expect(start.lng).toBeCloseTo(nyc.lng, 1);
    expect(end.lat).toBeCloseTo(kef.lat, 1);
    expect(end.lng).toBeCloseTo(kef.lng, 1);
  });

  it("projects a dragged point back onto the arc", () => {
    const arc = buildFlightArcPoints(nyc, kef, 48);
    const mid = positionOnArc(arc, 0.5);
    const progress = progressFromLatLng(arc, mid.lat, mid.lng);
    expect(progress).toBeGreaterThan(0.35);
    expect(progress).toBeLessThan(0.65);
  });
});
