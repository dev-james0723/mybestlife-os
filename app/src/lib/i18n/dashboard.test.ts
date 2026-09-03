import { describe, expect, it } from "vitest";

import { APP_LOCALES } from "@/lib/i18n/app-locale";
import { getDashboardCopy } from "@/lib/i18n/dashboard";

const knowledgePickKeys = [
  "knowledgePickTitle",
  "knowledgePickDescription",
  "knowledgePickOpen",
  "knowledgePickBrowse",
  "knowledgePickEmpty",
  "knowledgePickUnavailable",
  "knowledgePickRetry",
  "knowledgePickSummaryFallback",
] as const;

describe("dashboard knowledge pick copy", () => {
  it("provides complete copy for every supported locale", () => {
    for (const locale of APP_LOCALES) {
      const copy = getDashboardCopy(locale);
      for (const key of knowledgePickKeys) {
        expect(copy[key].trim(), `${locale}.${key}`).not.toBe("");
      }
    }
  });

  it("uses the requested English and Traditional Chinese titles", () => {
    expect(getDashboardCopy("en").knowledgePickTitle).toBe("Today’s Knowledge Pick");
    expect(getDashboardCopy("zh-TW").knowledgePickTitle).toBe("今日知識精選");
  });

  it("does not expose the removed study dashboard fields", () => {
    for (const locale of APP_LOCALES) {
      const copy = getDashboardCopy(locale) as unknown as Record<string, unknown>;
      expect(copy).not.toHaveProperty("statStreak");
      expect(copy).not.toHaveProperty("recentStudy");
      expect(copy).not.toHaveProperty("noSessions");
    }
  });
});
