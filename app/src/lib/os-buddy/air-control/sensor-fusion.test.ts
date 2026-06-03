import { describe, expect, it } from "vitest";
import { fuseReadings, selectBestSource } from "./sensor-fusion";
import type { AirTouchReading, SourceHealth } from "./types";

function health(over: Partial<SourceHealth>): SourceHealth {
  return {
    sourceId: "a",
    sensorMode: "rgb-webcam",
    lastSampleAt: 1000,
    confidence: 0.8,
    quality: "uncalibrated",
    ...over,
  };
}

describe("selectBestSource", () => {
  it("prefers higher quality", () => {
    const sources = [
      health({ sourceId: "rgb", quality: "uncalibrated" }),
      health({ sourceId: "stereo", sensorMode: "stereo", quality: "good" }),
    ];
    expect(selectBestSource(sources, 1000)).toBe("stereo");
  });

  it("falls back when the better source is stale", () => {
    const sources = [
      health({ sourceId: "rgb", lastSampleAt: 1000, quality: "uncalibrated" }),
      health({ sourceId: "stereo", sensorMode: "stereo", quality: "good", lastSampleAt: 500 }),
    ];
    // at t=1000, stereo is 500ms old -> stale; rgb is fresh
    expect(selectBestSource(sources, 1000)).toBe("rgb");
  });

  it("returns null when everything is stale", () => {
    const sources = [health({ lastSampleAt: 0 })];
    expect(selectBestSource(sources, 10_000)).toBeNull();
  });

  it("breaks ties on sensor family then confidence", () => {
    const sources = [
      health({ sourceId: "phone", sensorMode: "phone-rgb", confidence: 0.5 }),
      health({ sourceId: "rgb", sensorMode: "rgb-webcam", confidence: 0.99 }),
    ];
    // same quality (uncalibrated); phone-rgb outranks rgb-webcam
    expect(selectBestSource(sources, 1000)).toBe("phone");
  });
});

describe("fuseReadings", () => {
  function reading(confidence: number): AirTouchReading {
    return {
      timestamp: 0,
      fingertip: { x: confidence, y: 0 },
      isIndexExtended: true,
      gesture: "Index_Point",
      confidence,
      mode: "2d",
      sensorMode: "rgb-webcam",
    };
  }

  it("passes through the highest-confidence reading", () => {
    const fused = fuseReadings([reading(0.3), reading(0.9), reading(0.5)]);
    expect(fused?.confidence).toBe(0.9);
  });

  it("returns null for no readings", () => {
    expect(fuseReadings([])).toBeNull();
  });
});
