import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features", () => ({
  FINANCE_ENABLED: false,
  HEALTH_ENABLED: false,
  LEARNING_ENABLED: false,
  LIFE_COMPANION_ENABLED: false,
  NOTES_ENABLED: false,
  WEEKLY_REVIEW_ENABLED: false,
}));

import { navigationCategories } from "@/lib/constants/navigation";

describe("production-hidden navigation", () => {
  it("omits Health when the feature is disabled", () => {
    expect(
      navigationCategories.some((category) =>
        category.items.some((item) => item.itemId === "health"),
      ),
    ).toBe(false);
  });

  it("omits Finance when the feature is disabled", () => {
    expect(
      navigationCategories.some((category) =>
        category.items.some((item) => item.itemId === "finance"),
      ),
    ).toBe(false);
  });

  it("omits Notes when the feature is disabled", () => {
    expect(
      navigationCategories.some((category) =>
        category.items.some((item) => item.itemId === "notes"),
      ),
    ).toBe(false);
  });

  it("omits Weekly Review when the feature is disabled", () => {
    expect(
      navigationCategories.some((category) =>
        category.items.some((item) => item.itemId === "weekly-review"),
      ),
    ).toBe(false);
  });

  it("omits the Learning category and Japanese Study item when Learning is disabled", () => {
    expect(
      navigationCategories.some((category) => category.categoryId === "learning"),
    ).toBe(false);
    expect(
      navigationCategories.some((category) =>
        category.items.some((item) => item.itemId === "japanese-study"),
      ),
    ).toBe(false);
  });
});
