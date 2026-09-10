import { describe, expect, it } from "vitest";

import { APP_LOCALES } from "@/lib/i18n/app-locale";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import { PROMPT_TOP_CATEGORIES } from "@/types/prompt";

describe("AI Knowledge category copy", () => {
  it("provides a human-readable label for every category in every locale", () => {
    for (const locale of APP_LOCALES) {
      const copy = getAiKnowledgeUiCopy(locale);

      expect(Object.keys(copy.topCategoryLabels).sort()).toEqual(
        [...PROMPT_TOP_CATEGORIES].sort(),
      );

      for (const category of PROMPT_TOP_CATEGORIES) {
        const label = copy.topCategoryLabels[category].trim();

        expect(label, `${locale}.${category}`).not.toBe("");
        expect(label, `${locale}.${category}`).not.toBe(category);
        expect(label, `${locale}.${category}`).not.toContain("__all__");
      }
    }
  });

  it("never exposes the internal all-option sentinel as filter copy", () => {
    for (const locale of APP_LOCALES) {
      const { filters } = getAiKnowledgeUiCopy(locale);

      for (const label of [
        filters.allCategories,
        filters.allSubcategories,
        filters.tagFilterPlaceholder,
      ]) {
        expect(label.trim(), locale).not.toBe("");
        expect(label, locale).not.toBe("__all__");
        expect(label, locale).not.toContain("__all__");
      }
    }
  });
});
