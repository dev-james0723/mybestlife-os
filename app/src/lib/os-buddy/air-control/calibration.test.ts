import { describe, expect, it } from "vitest";
import {
  identityCalibration,
  isUsableCalibration,
  qualityFromRms,
  reprojectionRmsError,
  summarizeCalibration,
} from "./calibration";

describe("qualityFromRms", () => {
  it("maps error to tiers with practical thresholds", () => {
    expect(qualityFromRms(null)).toBe("uncalibrated");
    expect(qualityFromRms(Number.NaN)).toBe("uncalibrated");
    expect(qualityFromRms(5)).toBe("good");
    expect(qualityFromRms(15)).toBe("good");
    expect(qualityFromRms(25)).toBe("ok");
    expect(qualityFromRms(40)).toBe("ok");
    expect(qualityFromRms(80)).toBe("poor");
  });
});

describe("reprojectionRmsError", () => {
  it("is zero for a perfect fit", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(reprojectionRmsError(pts, pts)).toBe(0);
  });

  it("returns null for empty input", () => {
    expect(reprojectionRmsError([], [])).toBeNull();
  });

  it("computes RMS over residuals", () => {
    const observed = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const predicted = [
      { x: 3, y: 4 }, // residual 5
      { x: 0, y: 0 }, // residual 0
    ];
    // rms = sqrt((25 + 0)/2) = sqrt(12.5)
    expect(reprojectionRmsError(observed, predicted)).toBeCloseTo(Math.sqrt(12.5));
  });
});

describe("identityCalibration / usability / summary", () => {
  it("identity is uncalibrated and not usable", () => {
    const cal = identityCalibration({ width: 800, height: 600 });
    expect(cal.quality).toBe("uncalibrated");
    expect(isUsableCalibration(cal)).toBe(false);
    expect(isUsableCalibration(null)).toBe(false);
  });

  it("good calibration is usable; poor is not", () => {
    const good = { ...identityCalibration({ width: 1, height: 1 }), quality: "good" as const };
    const poor = { ...identityCalibration({ width: 1, height: 1 }), quality: "poor" as const };
    expect(isUsableCalibration(good)).toBe(true);
    expect(isUsableCalibration(poor)).toBe(false);
  });

  it("summarize keeps only numbers", () => {
    const cal = {
      ...identityCalibration({ width: 1, height: 1 }),
      quality: "ok" as const,
      rmsErrorPx: 22,
    };
    expect(summarizeCalibration(cal)).toEqual({
      quality: "ok",
      rmsErrorPx: 22,
      createdAt: cal.createdAt,
    });
    expect(summarizeCalibration(null)).toEqual({
      quality: "uncalibrated",
      rmsErrorPx: null,
      createdAt: null,
    });
  });
});
