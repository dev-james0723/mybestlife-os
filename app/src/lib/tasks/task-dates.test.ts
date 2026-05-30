import { describe, expect, it } from "vitest";

import {
  deadlineBucketToColumn,
  getDeadlineBucket,
  matchesDatePreset,
  matchesDeadlineFilter,
} from "./task-dates";

// Wednesday, May 13 2026, noon local. Monday-based week => Mon May 11 .. Sun May 17.
const NOW = new Date(2026, 4, 13, 12, 0, 0);

describe("getDeadlineBucket", () => {
  it("returns 'none' for missing dates", () => {
    expect(getDeadlineBucket(null, NOW)).toBe("none");
    expect(getDeadlineBucket(undefined, NOW)).toBe("none");
  });

  it("classifies relative dates", () => {
    expect(getDeadlineBucket("2026-05-12", NOW)).toBe("overdue");
    expect(getDeadlineBucket("2026-05-13", NOW)).toBe("today");
    expect(getDeadlineBucket("2026-05-14", NOW)).toBe("tomorrow");
    expect(getDeadlineBucket("2026-05-15", NOW)).toBe("this-week");
    expect(getDeadlineBucket("2026-05-17", NOW)).toBe("this-week");
    expect(getDeadlineBucket("2026-05-18", NOW)).toBe("next-week");
    expect(getDeadlineBucket("2026-05-24", NOW)).toBe("next-week");
    expect(getDeadlineBucket("2026-05-28", NOW)).toBe("this-month");
    expect(getDeadlineBucket("2026-06-15", NOW)).toBe("later");
  });
});

describe("deadlineBucketToColumn", () => {
  it("folds fine buckets into board columns", () => {
    expect(deadlineBucketToColumn("overdue")).toBe("overdue");
    expect(deadlineBucketToColumn("today")).toBe("today");
    expect(deadlineBucketToColumn("tomorrow")).toBe("this-week");
    expect(deadlineBucketToColumn("this-week")).toBe("this-week");
    expect(deadlineBucketToColumn("next-week")).toBe("later");
    expect(deadlineBucketToColumn("this-month")).toBe("later");
    expect(deadlineBucketToColumn("later")).toBe("later");
    expect(deadlineBucketToColumn("none")).toBe("none");
  });
});

describe("matchesDeadlineFilter", () => {
  it("matches single buckets", () => {
    expect(matchesDeadlineFilter("2026-05-13", "today", NOW)).toBe(true);
    expect(matchesDeadlineFilter("2026-05-14", "today", NOW)).toBe(false);
    expect(matchesDeadlineFilter("2026-05-12", "overdue", NOW)).toBe(true);
    expect(matchesDeadlineFilter(null, "none", NOW)).toBe(true);
  });

  it("'this-week' includes today and tomorrow", () => {
    expect(matchesDeadlineFilter("2026-05-13", "this-week", NOW)).toBe(true);
    expect(matchesDeadlineFilter("2026-05-14", "this-week", NOW)).toBe(true);
    expect(matchesDeadlineFilter("2026-05-17", "this-week", NOW)).toBe(true);
    expect(matchesDeadlineFilter("2026-05-18", "this-week", NOW)).toBe(false);
  });

  it("'all' matches everything; custom uses the range", () => {
    expect(matchesDeadlineFilter(null, "all", NOW)).toBe(true);
    expect(
      matchesDeadlineFilter("2026-05-20", "custom", NOW, {
        start: "2026-05-18",
        end: "2026-05-24",
      }),
    ).toBe(true);
    expect(
      matchesDeadlineFilter("2026-05-25", "custom", NOW, {
        start: "2026-05-18",
        end: "2026-05-24",
      }),
    ).toBe(false);
  });
});

describe("matchesDatePreset", () => {
  it("handles today / this-week / recent presets", () => {
    expect(matchesDatePreset("2026-05-13", "today", NOW)).toBe(true);
    expect(matchesDatePreset("2026-05-12", "today", NOW)).toBe(false);
    expect(matchesDatePreset("2026-05-15", "this-week", NOW)).toBe(true);
    expect(matchesDatePreset("2026-05-18", "this-week", NOW)).toBe(false);
    expect(matchesDatePreset("2026-05-12", "recent", NOW)).toBe(true);
    expect(matchesDatePreset("2026-05-10", "recent", NOW)).toBe(false);
  });

  it("'all' matches and null fails non-all presets", () => {
    expect(matchesDatePreset(null, "all", NOW)).toBe(true);
    expect(matchesDatePreset(null, "today", NOW)).toBe(false);
  });
});
