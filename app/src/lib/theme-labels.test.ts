import { describe, expect, it } from "vitest";
import { navigationCategories } from "@/lib/constants/navigation";
import { UI_THEMES } from "@/lib/theme-config";
import {
  getThemedCategoryLabel,
  getThemedItemLabel,
} from "@/lib/theme-labels";
import type { AppLocale } from "@/lib/i18n/app-locale";

const SUPPORTED_LOCALES: AppLocale[] = [
  "en",
  "zh-TW",
  "zh-CN",
  "ja",
  "ko",
  "fr",
  "it",
  "es",
  "vi",
];

const EXTRA_ITEM_IDS = [
  "google-calendar",
  "garden",
  "quick-capture",
  "settings",
  "ai-assistant",
  "youtube-radar",
  "business-analyst",
  "relationships",
  "role-models",
] as const;

describe("theme-invariant navigation taxonomy", () => {
  it("matches the canonical navigation registry in English", () => {
    for (const category of navigationCategories) {
      expect(getThemedCategoryLabel(category.categoryId, "default", "en")).toBe(
        category.title,
      );

      for (const item of category.items) {
        expect(getThemedItemLabel(item.itemId, "default", "en")).toBe(item.title);
      }
    }
  });

  it("uses the Default-theme category names in every theme and locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const category of navigationCategories) {
        const canonical = getThemedCategoryLabel(category.categoryId, "default", locale);

        for (const uiTheme of UI_THEMES) {
          expect(getThemedCategoryLabel(category.categoryId, uiTheme, locale)).toBe(
            canonical,
          );
        }
      }
    }
  });

  it("uses the Default-theme page and subpage names in every theme and locale", () => {
    const navigationItemIds = navigationCategories.flatMap((category) =>
      category.items.map((item) => item.itemId),
    );
    const itemIds = [...new Set([...navigationItemIds, ...EXTRA_ITEM_IDS])];

    for (const locale of SUPPORTED_LOCALES) {
      for (const itemId of itemIds) {
        const canonical = getThemedItemLabel(itemId, "default", locale);

        for (const uiTheme of UI_THEMES) {
          expect(getThemedItemLabel(itemId, uiTheme, locale)).toBe(canonical);
        }
      }
    }
  });
});
