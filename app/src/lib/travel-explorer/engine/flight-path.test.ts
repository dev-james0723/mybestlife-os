import { describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { WGS84_ELLIPSOID } from "3d-tiles-renderer/three";
import { createFlightPath, sampleFlightPath, ORBIT_POSITION } from "./flight-path";

describe("travel camera geography", () => {
  for (const target of [{ lat: 35.6762, lng: 139.6503 }, { lat: 90, lng: 0 }, { lat: -90, lng: 180 }, { lat: 0, lng: -179.99 }]) {
    it(`arrives above ${target.lat}, ${target.lng} without crossing Earth`, () => {
      const path = createFlightPath(ORBIT_POSITION, new Quaternion(), target, true);
      const position = new Vector3(); const orientation = new Quaternion();
      for (let i = 0; i <= 420; i++) {
        sampleFlightPath(path, i / 420, position, orientation);
        expect(WGS84_ELLIPSOID.getPositionElevation(position)).toBeGreaterThan(17000);
        expect(orientation.toArray().every(Number.isFinite)).toBe(true);
        expect(orientation.length()).toBeCloseTo(1, 8);
      }
      expect(position.distanceTo(path.endPosition)).toBeLessThan(0.001);
      sampleFlightPath(path, 0, position, orientation);
      expect(position.distanceTo(ORBIT_POSITION)).toBe(0);
    });
  }
  it("takes a safe arc between opposite cities with continuous endpoints", () => {
    const first = createFlightPath(ORBIT_POSITION, new Quaternion(), { lat: 0, lng: 0 }, true);
    const path = createFlightPath(first.endPosition, new Quaternion(), { lat: 0, lng: 180 }, true);
    const position = new Vector3(); const orientation = new Quaternion();
    const previous = path.startPosition.clone();
    for (let i = 0; i <= 840; i++) {
      sampleFlightPath(path, i / 840, position, orientation);
      expect(WGS84_ELLIPSOID.getPositionElevation(position)).toBeGreaterThan(17000);
      expect(position.distanceTo(previous)).toBeLessThan(250000);
      if (i === 1 || i === 840) expect(position.distanceTo(previous)).toBeLessThan(20);
      previous.copy(position);
    }
  });
  it("frames a region when photorealistic city tiles are unavailable", () => {
    const target = { lat: 48.8566, lng: 2.3522 };
    const path = createFlightPath(ORBIT_POSITION, new Quaternion(), target, false);
    expect(WGS84_ELLIPSOID.getPositionElevation(path.endPosition)).toBeGreaterThan(2e6);
  });
});
