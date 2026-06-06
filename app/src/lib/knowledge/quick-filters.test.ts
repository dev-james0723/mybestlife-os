import { describe, expect, it } from "vitest";
import type { KnowledgeItem } from "@/types/knowledge";
import {
  cleanActiveKnowledgeQuickFilterIds,
  getDefaultKnowledgeQuickFilters,
  matchesBuiltInKnowledgeQuickFilter,
  matchesKnowledgeQuickFilterDefinition,
  normalizeKnowledgeQuickFilters,
  type KnowledgeQuickFilterDefinition,
} from "./quick-filters";

const NOW = new Date("2026-06-06T12:00:00.000Z").getTime();

function item(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: "item-1",
    userId: "user-1",
    title: "Stripe checkout notes",
    contentType: "article",
    aiTags: [],
    manualTags: [],
    aiKeyInsights: [],
    aiKeyQuotes: [],
    aiQuestionsAnswered: [],
    aiActionItems: [],
    aiVideoChatStarters: [],
    status: "ready",
    dateAdded: "2026-06-05T12:00:00.000Z",
    dateModified: "2026-06-05T12:00:00.000Z",
    ...overrides,
  };
}

describe("knowledge quick filters", () => {
  it("falls back to built-in defaults for invalid profile JSON", () => {
    const normalized = normalizeKnowledgeQuickFilters({ bad: true });

    expect(normalized.map((def) => def.id)).toEqual(
      getDefaultKnowledgeQuickFilters().map((def) => def.id),
    );
    expect(normalized.every((def) => def.visible && def.builtIn)).toBe(true);
  });

  it("preserves custom filters and appends missing built-ins", () => {
    const normalized = normalizeKnowledgeQuickFilters([
      {
        id: "custom-tag-ai",
        label: "AI",
        icon: "tag",
        visible: true,
        match: "all",
        rules: [{ id: "r1", field: "tag", operator: "contains", value: "ai" }],
      },
      {
        id: "recent",
        label: "Fresh",
        icon: "clock",
        visible: false,
        match: "all",
        rules: [{ id: "r2", field: "builtin", operator: "is", value: "recent" }],
      },
    ]);

    expect(normalized[0]?.id).toBe("custom-tag-ai");
    expect(normalized.find((def) => def.id === "recent")?.visible).toBe(false);
    expect(normalized.map((def) => def.id)).toContain("needsReview");
  });

  it("cleans active ids when filters are hidden or unknown", () => {
    const defs = normalizeKnowledgeQuickFilters([
      {
        id: "recent",
        label: "Recent",
        icon: "clock",
        visible: false,
        match: "all",
        rules: [{ id: "r1", field: "builtin", operator: "is", value: "recent" }],
      },
    ]);

    expect(cleanActiveKnowledgeQuickFilterIds(["recent", "github", "ghost"], defs)).toEqual([
      "github",
    ]);
  });

  it("matches built-in predicates", () => {
    expect(matchesBuiltInKnowledgeQuickFilter(item(), "recent", NOW)).toBe(true);
    expect(
      matchesBuiltInKnowledgeQuickFilter(
        item({ dateAdded: "2026-05-01T12:00:00.000Z" }),
        "recent",
        NOW,
      ),
    ).toBe(false);
    expect(
      matchesBuiltInKnowledgeQuickFilter(
        item({ category: "social_media", sourceType: "social_x_post" }),
        "social",
        NOW,
      ),
    ).toBe(true);
    expect(
      matchesBuiltInKnowledgeQuickFilter(
        item({ provider: "github", sourceType: "github_repository" }),
        "github",
        NOW,
      ),
    ).toBe(true);
    expect(matchesBuiltInKnowledgeQuickFilter(item({ thumbnailUrl: "x.png" }), "hasMedia", NOW)).toBe(
      true,
    );
    expect(matchesBuiltInKnowledgeQuickFilter(item({ sourceUrl: "https://x.test" }), "hasSource", NOW)).toBe(
      true,
    );
    expect(matchesBuiltInKnowledgeQuickFilter(item({ aiTags: ["agent"] }), "aiGenerated", NOW)).toBe(
      true,
    );
    expect(matchesBuiltInKnowledgeQuickFilter(item({ status: "error" }), "needsReview", NOW)).toBe(
      true,
    );
  });

  it("supports all and any rule matching", () => {
    const allDef: KnowledgeQuickFilterDefinition = {
      id: "custom-all",
      label: "Stripe articles",
      icon: "filter",
      visible: true,
      builtIn: false,
      match: "all",
      rules: [
        { id: "r1", field: "contentType", operator: "is", value: "article" },
        { id: "r2", field: "text", operator: "contains", value: "stripe" },
      ],
    };
    const anyDef: KnowledgeQuickFilterDefinition = {
      ...allDef,
      id: "custom-any",
      match: "any",
      rules: [
        { id: "r1", field: "contentType", operator: "is", value: "video" },
        { id: "r2", field: "tag", operator: "contains", value: "billing" },
      ],
    };

    expect(matchesKnowledgeQuickFilterDefinition(item(), allDef, NOW)).toBe(true);
    expect(matchesKnowledgeQuickFilterDefinition(item({ contentType: "note" }), allDef, NOW)).toBe(
      false,
    );
    expect(
      matchesKnowledgeQuickFilterDefinition(item({ manualTags: ["billing"] }), anyDef, NOW),
    ).toBe(true);
  });
});
