import { describe, expect, it } from "vitest";

import {
  ANALYTICS_RANGE_OPTIONS,
  getAnalyticsBucketGranularity,
  getAnalyticsDateRange,
  validateAnalyticsDateRange,
} from "./date-range";

const NOW = new Date(2026, 5, 7, 12, 0, 0);

describe("analytics date ranges", () => {
  it("exposes the full granular preset list", () => {
    expect(ANALYTICS_RANGE_OPTIONS.map((option) => option.key)).toEqual([
      "1D",
      "3D",
      "7D",
      "14D",
      "21D",
      "30D",
      "45D",
      "2M",
      "90D",
      "6M",
      "9M",
      "1Y",
      "18M",
      "2Y",
      "3Y",
      "5Y",
      "10Y",
    ]);
  });

  it("resolves short preset windows inclusively", () => {
    const oneDay = getAnalyticsDateRange({ source: "preset", key: "1D" }, NOW);
    expect(oneDay.startISO).toBe("2026-06-07");
    expect(oneDay.endISO).toBe("2026-06-07");
    expect(oneDay.days).toBe(1);

    const fourteenDays = getAnalyticsDateRange({ source: "preset", key: "14D" }, NOW);
    expect(fourteenDays.startISO).toBe("2026-05-25");
    expect(fourteenDays.endISO).toBe("2026-06-07");
    expect(fourteenDays.days).toBe(14);
  });

  it("resolves custom ranges and their previous comparison period", () => {
    const custom = getAnalyticsDateRange(
      { source: "custom", startISO: "2026-06-01", endISO: "2026-06-07" },
      NOW,
    );

    expect(custom.key).toBe("CUSTOM");
    expect(custom.source).toBe("custom");
    expect(custom.days).toBe(7);
    expect(custom.previousStartISO).toBe("2026-05-25");
    expect(custom.previousEndISO).toBe("2026-05-31");
  });

  it("resolves saved ranges with the saved label and id", () => {
    const saved = getAnalyticsDateRange(
      {
        source: "saved",
        presetId: "range-1",
        name: "Launch quarter",
        startISO: "2026-04-01",
        endISO: "2026-06-07",
      },
      NOW,
    );

    expect(saved.key).toBe("CUSTOM");
    expect(saved.source).toBe("saved");
    expect(saved.presetId).toBe("range-1");
    expect(saved.label).toBe("Launch quarter");
    expect(saved.startISO).toBe("2026-04-01");
  });

  it("rejects invalid custom ranges", () => {
    expect(validateAnalyticsDateRange("", "2026-06-07", NOW)).toEqual({
      ok: false,
      error: "missing",
    });
    expect(validateAnalyticsDateRange("2026-06-08", "2026-06-07", NOW)).toEqual({
      ok: false,
      error: "start_after_end",
    });
    expect(validateAnalyticsDateRange("2026-06-01", "2026-06-08", NOW)).toEqual({
      ok: false,
      error: "future_end",
    });
    expect(validateAnalyticsDateRange("2016-06-01", "2026-06-07", NOW)).toEqual({
      ok: false,
      error: "too_long",
    });
  });

  it("selects chart bucket granularity by range length", () => {
    expect(getAnalyticsBucketGranularity(getAnalyticsDateRange("45D", NOW))).toBe("day");
    expect(getAnalyticsBucketGranularity(getAnalyticsDateRange("90D", NOW))).toBe("week");
    expect(getAnalyticsBucketGranularity(getAnalyticsDateRange("2Y", NOW))).toBe("month");
  });
});
