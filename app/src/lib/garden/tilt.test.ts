import { describe, expect, it } from "vitest";
import { GardenTiltController, screenHeading, screenTilt, tiltToInput, TILT_STALE_MS } from "./tilt";
import { createAdventure, navigateAdventure, stepAdventure } from "./adventure";

function calibrated(beta = 45, gamma = 0, angle = 0) {
  const controller = new GardenTiltController();
  for (let now = 0; now <= 500; now += 20) {
    controller.sample(beta, gamma, angle, now);
    controller.read(now);
  }
  expect(controller.status).toBe("ready");
  return controller;
}
function lean(controller: GardenTiltController, beta: number, gamma = 0, angle = 0, from = 520) {
  for (let now = from; now < from + 400; now += 20) {
    controller.sample(beta, gamma, angle, now);
    controller.read(now);
  }
  return controller.output;
}
describe("calibrated phone tilt movement", () => {
  it("starts still at a comfortable grip and ignores small sensor tremor", () => {
    const c = calibrated();
    for (let now = 520; now <= 1500; now += 20) {
      c.sample(45 + 0.15 * Math.sin(now), 0.15 * Math.cos(now), 0, now);
      expect(c.read(now)).toEqual({ x: 0, z: 0 });
    }
  });
  it("detects a one-degree deliberate lean and speeds up continuously to the cap", () => {
    const speeds = [1, 2, 5, 10, 18, 30].map(degrees => -lean(calibrated(), 45 - degrees).z);
    expect(speeds[0]).toBeGreaterThan(0.02);
    expect(speeds[0]).toBeLessThan(0.07);
    for (let i = 1; i < 5; i++) expect(speeds[i]).toBeGreaterThan(speeds[i - 1]);
    expect(speeds[5]).toBeCloseTo(1, 4);
  });
  it("detects half-degree changes in sensitive mode but suppresses 0.2 degree jitter", () => {
    const c = calibrated(); c.sensitivity = "sensitive";
    expect(-lean(c, 44.5).z).toBeGreaterThan(0.015);
    expect(lean(c, 44.8, 0, 0, 920)).toEqual({ x: 0, z: 0 });
  });
  it("moves backwards and sideways, caps diagonals, and returns exactly to zero", () => {
    const c = calibrated();
    expect(lean(c, 55).z).toBeGreaterThan(0);
    expect(lean(c, 45, 15, 0, 920).x).toBeGreaterThan(0);
    expect(lean(c, 45, -15, 0, 1320).x).toBeLessThan(0);
    expect(Math.hypot(...Object.values(tiltToInput({ x: 45, z: -45 }, "balanced")))).toBeCloseTo(1);
    c.sample(45, 0, 0, 1720);
    expect(c.read(1720)).toEqual({ x: 0, z: 0 });
  });
  it("maps both landscape orientations and upside-down portrait to the screen", () => {
    expect(screenTilt(0, 30, 90)?.z).toBeCloseTo(-30);
    expect(screenTilt(0, -30, 270)?.z).toBeCloseTo(-30);
    expect(screenTilt(-30, 0, 180)?.z).toBeCloseTo(30);
    expect(lean(calibrated(0, -45, 90), 0, -35, 90).z).toBeLessThan(0);
    expect(lean(calibrated(0, 45, 270), 0, 35, 270).z).toBeLessThan(0);
    expect(lean(calibrated(-45, 0, 180), -35, 0, 180).z).toBeLessThan(0);
    expect(screenTilt(10, -45, 90)?.x).toBeGreaterThan(0);
    expect(screenTilt(-10, 45, 270)?.x).toBeGreaterThan(0);
  });
  it("rejects null/nonfinite/out-of-range data without movement", () => {
    for (const [b, g] of [[null, 0], [0, null], [NaN, 0], [0, Infinity], [181, 0], [0, 91]]) expect(screenTilt(b, g, 0)).toBeNull();
    const c = calibrated(); lean(c, 30);
    c.sample(null, null, 0, 940);
    expect(c.read(940)).toEqual({ x: 0, z: 0 });
  });
  it("waits for a steady grip, including during gradual movement", () => {
    const c = new GardenTiltController();
    for (let now = 0; now <= 1000; now += 20) {
      c.sample(45 + now / 100, 0, 0, now);
      expect(c.read(now)).toEqual({ x: 0, z: 0 });
      expect(c.status).not.toBe("ready");
    }
  });
  it("stops on signal loss, pause, rotation and recenter; resumes with new calibration", () => {
    const c = calibrated(); lean(c, 30);
    expect(c.read(920 + TILT_STALE_MS)).toEqual({ x: 0, z: 0 });
    expect(c.status).toBe("stale");
    expect(c.read(2200, true)).toEqual({ x: 0, z: 0 });
    c.sample(20, 0, 0, 2210);
    expect(c.read(2220, false)).toEqual({ x: 0, z: 0 });
    c.sample(0, -40, 90, 2240);
    expect(c.read(2240)).toEqual({ x: 0, z: 0 });
    c.recalibrate(); expect(c.output).toEqual({ x: 0, z: 0 });
  });
  it("holds a steady angle when motion heartbeats arrive without orientation changes", () => {
    const c = calibrated(); lean(c, 35);
    for (let now = 920; now <= 5000; now += 20) {
      c.heartbeat(now);
      expect(c.read(now).z).toBeLessThan(-0.4);
    }
  });
  it("does not lose tiny sensor movement to a tap-to-walk destination", () => {
    const s = createAdventure("2026-09-09"); s.phase = "playing";
    s.player.x = 0; s.player.z = 2;
    navigateAdventure(s, { x: 0, z: 6 });
    const input = lean(calibrated(), 44);
    expect(Math.hypot(input.x, input.z)).toBeLessThan(0.06);
    for (let i = 0; i < 60; i++) stepAdventure(s, 1 / 60, { ...input, yaw: 0, preciseMovement: true });
    expect(s.target).toBeNull(); expect(s.player.z).toBeLessThan(1.95);
  });
  it("supports 360-degree yaw steering continuously at every heading", () => {
    for (let heading = 0; heading < 360; heading += 5) {
      const c = calibrated();
      for (let now = 520; now <= 1500; now += 20) {
        c.sample(35, 0, 0, now, heading); c.read(now);
      }
      const direction = Math.atan2(-c.output.x, -c.output.z);
      const expected = heading * Math.PI / 180;
      expect(Math.cos(direction - expected)).toBeGreaterThan(0.9999);
      expect(Math.hypot(c.output.x, c.output.z)).toBeCloseTo(-tiltToInput({ x: 0, z: -10 }, "balanced").z, 3);
    }
  });
  it("combines diagonal lean and heading without snapping or speeding up", () => {
    const c = calibrated();
    for (let now = 520; now <= 1500; now += 20) { c.sample(35, 8, 0, now, 37); c.read(now); }
    const pose = screenTilt(35, 8, 0)!;
    const base = tiltToInput({ x: pose.x, z: pose.z - 45 }, "balanced");
    const yaw = (37 + 2 * Math.atan(Math.tan(35 * Math.PI / 360) * Math.tan(8 * Math.PI / 360)) * 180 / Math.PI) * Math.PI / 180;
    expect(c.output.x).toBeCloseTo(base.x * Math.cos(yaw) + base.z * Math.sin(yaw), 3);
    expect(c.output.z).toBeCloseTo(-base.x * Math.sin(yaw) + base.z * Math.cos(yaw), 3);
  });
  it("handles heading wrap, pure yaw at rest, and missing heading", () => {
    const c = calibrated();
    for (let now = 520; now <= 1500; now += 20) { c.sample(45, 0, 0, now, 90); expect(c.read(now)).toEqual({ x: 0, z: 0 }); }
    expect(screenHeading(null, 45, 0, 0)).toBeNull();
    expect(screenHeading(359, 45, 0, 0)).toBeCloseTo(-1);
    const h = new GardenTiltController();
    for (let now = 0; now <= 500; now += 20) { h.sample(45, 0, 0, now, 359); h.read(now); }
    for (let now = 520; now <= 1500; now += 20) { h.sample(35, 0, 0, now, 1); h.read(now); }
    expect(Math.atan2(-h.output.x, -h.output.z) * 180 / Math.PI).toBeCloseTo(2, 2);
  });
  it("keeps heading through an upright grip and repeated complete rotations", () => {
    for (const beta of [80, 89, 90, 91, 100]) expect(screenHeading(37, beta, 0, 0)).toBeCloseTo(37);
    expect(screenHeading(0, 180, 0, 0)).toBeNull();
    const c = calibrated();
    let now = 520;
    for (let alpha = 0; alpha <= 1080; alpha += 3) { c.sample(35, 0, 0, now, alpha % 360); c.read(now); now += 20; }
    for (let i = 0; i < 50; i++) { c.sample(35, 0, 0, now, 0); c.read(now); now += 20; }
    expect(c.output.x).toBeCloseTo(0, 4); expect(c.output.z).toBeLessThan(-0.4);
  });
});
