import { describe, expect, it } from "vitest";
import { lowPass, OneEuroFilter } from "./filters";

function jitter(base: number, amplitude: number, i: number): number {
  // Deterministic pseudo-noise.
  return base + Math.sin(i * 12.9898) * amplitude;
}

describe("OneEuroFilter", () => {
  it("reduces jitter on a noisy static signal", () => {
    const filter = new OneEuroFilter(1.0, 0.0, 1.0);
    const base = 100;
    const amplitude = 5;
    let rawError = 0;
    let filteredError = 0;
    let t = 0;
    for (let i = 0; i < 60; i += 1) {
      t += 16;
      const raw = jitter(base, amplitude, i);
      const filtered = filter.filter(raw, t);
      if (i > 10) {
        rawError += Math.abs(raw - base);
        filteredError += Math.abs(filtered - base);
      }
    }
    expect(filteredError).toBeLessThan(rawError);
  });

  it("tracks a fast ramp without large steady-state lag", () => {
    const filter = new OneEuroFilter(1.0, 0.7, 1.0);
    let t = 0;
    let value = 0;
    let last = 0;
    for (let i = 0; i < 80; i += 1) {
      t += 16;
      value = i * 10; // fast linear ramp
      last = filter.filter(value, t);
    }
    // With beta>0 the filter keeps up with the ramp; final lag should be modest.
    expect(Math.abs(value - last)).toBeLessThan(value * 0.2);
  });

  it("resets cleanly", () => {
    const filter = new OneEuroFilter();
    filter.filter(5, 0);
    filter.reset();
    expect(filter.filter(42, 16)).toBe(42);
  });
});

describe("lowPass", () => {
  it("returns next when there is no previous value", () => {
    expect(lowPass(null, { x: 3, y: 4 }, 0.5)).toEqual({ x: 3, y: 4 });
  });

  it("clamps alpha into 0..1", () => {
    const prev = { x: 0, y: 0 };
    const next = { x: 10, y: 10 };
    expect(lowPass(prev, next, 2)).toEqual({ x: 10, y: 10 });
    expect(lowPass(prev, next, -1)).toEqual({ x: 0, y: 0 });
    expect(lowPass(prev, next, 0.5)).toEqual({ x: 5, y: 5 });
  });
});
