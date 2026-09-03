import { describe, expect, it } from "vitest";

import {
  getKnowledgePickDayKey,
  selectDailyKnowledgePick,
  type DailyKnowledgeCandidate,
} from "./daily-knowledge-pick";

const readyItems: DailyKnowledgeCandidate[] = [
  { id: "knowledge-c", title: "Third", status: "ready" },
  { id: "knowledge-a", title: "First", status: "ready" },
  { id: "knowledge-b", title: "Second", status: "ready" },
];

describe("getKnowledgePickDayKey", () => {
  it("uses the local calendar date and rolls over at local midnight", () => {
    expect(getKnowledgePickDayKey(new Date(2026, 8, 3, 23, 59, 59))).toBe("2026-09-03");
    expect(getKnowledgePickDayKey(new Date(2026, 8, 4, 0, 0, 0))).toBe("2026-09-04");
  });

  it("respects an explicit profile timezone", () => {
    const instant = new Date("2026-09-04T03:30:00.000Z");
    expect(getKnowledgePickDayKey(instant, "America/New_York")).toBe("2026-09-03");
    expect(getKnowledgePickDayKey(instant, "Asia/Tokyo")).toBe("2026-09-04");
  });

  it("falls back to the local date for auto or invalid timezones", () => {
    const date = new Date(2026, 8, 3, 12, 0, 0);
    expect(getKnowledgePickDayKey(date, "auto")).toBe("2026-09-03");
    expect(getKnowledgePickDayKey(date, "Not/A_Timezone")).toBe("2026-09-03");
  });
});

describe("selectDailyKnowledgePick", () => {
  const options = { userId: "user-123", dayKey: "2026-09-03" };

  it("returns null when no eligible item exists", () => {
    expect(selectDailyKnowledgePick([], options)).toBeNull();
    expect(
      selectDailyKnowledgePick(
        [
          { id: "processing", title: "Still processing", status: "processing" },
          { id: "blank", title: "   ", status: "ready" },
          { id: "error", title: "Failed", status: "error" },
        ],
        options,
      ),
    ).toBeNull();
  });

  it("always returns the only eligible item", () => {
    const item = { id: "only", title: "Only ready item", status: "ready" };
    expect(selectDailyKnowledgePick([item], options)).toBe(item);
  });

  it("is stable for a user and day regardless of input order", () => {
    const first = selectDailyKnowledgePick(readyItems, options);
    const repeated = selectDailyKnowledgePick(readyItems, options);
    const reversed = selectDailyKnowledgePick([...readyItems].reverse(), options);

    expect(repeated?.id).toBe(first?.id);
    expect(reversed?.id).toBe(first?.id);
  });

  it("does not mutate the source array", () => {
    const idsBefore = readyItems.map((item) => item.id);
    selectDailyKnowledgePick(readyItems, options);
    expect(readyItems.map((item) => item.id)).toEqual(idsBefore);
  });

  it("handles different user seeds deterministically", () => {
    const first = selectDailyKnowledgePick(readyItems, {
      userId: "user-a",
      dayKey: "2026-09-03",
    });
    const repeated = selectDailyKnowledgePick(readyItems, {
      userId: "user-a",
      dayKey: "2026-09-03",
    });
    const secondUser = selectDailyKnowledgePick(readyItems, {
      userId: "user-b",
      dayKey: "2026-09-03",
    });

    expect(repeated?.id).toBe(first?.id);
    expect(secondUser).not.toBeNull();
  });
});
