import { describe, expect, it } from "vitest";
import type { Idea } from "@/types/database";
import {
  cleanActiveIdeaQuickFilterIds,
  getDefaultIdeaQuickFilters,
  matchesBuiltInIdeaQuickFilter,
  matchesIdeaQuickFilterDefinition,
  normalizeIdeaQuickFilters,
  type IdeaQuickFilterDefinition,
} from "./quick-filters";

const NOW = new Date("2026-06-06T12:00:00.000Z").getTime();

function idea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: "idea-1",
    user_id: "user-1",
    content: "<p>Stripe checkout pricing idea</p>",
    source_type: "text",
    capture_kind: "idea",
    voice_transcript: null,
    linked_project_ids: [],
    linked_task_ids: [],
    linked_goal_ids: [],
    linked_idea_ids: [],
    status: "captured",
    category: "product",
    created_at: "2026-06-05T12:00:00.000Z",
    updated_at: "2026-06-05T12:00:00.000Z",
    title: "Stripe checkout notes",
    ai_tags: [],
    manual_tags: [],
    destinations: [],
    attachments: [],
    ai_suggestions: null,
    processing_step: null,
    linked_knowledge_item_ids: [],
    linked_node_ids: [],
    related_resource_refs: [],
    ...overrides,
  };
}

describe("idea quick filters", () => {
  it("falls back to built-in defaults for invalid profile JSON", () => {
    const normalized = normalizeIdeaQuickFilters({ bad: true });

    expect(normalized.map((def) => def.id)).toEqual(
      getDefaultIdeaQuickFilters().map((def) => def.id),
    );
    expect(normalized.every((def) => def.visible && def.builtIn)).toBe(true);
  });

  it("preserves custom filters and appends missing built-ins", () => {
    const normalized = normalizeIdeaQuickFilters([
      {
        id: "custom-tag-billing",
        label: "Billing",
        icon: "tag",
        visible: true,
        match: "all",
        rules: [{ id: "r1", field: "tag", operator: "contains", value: "billing" }],
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

    expect(normalized[0]?.id).toBe("custom-tag-billing");
    expect(normalized.find((def) => def.id === "recent")?.visible).toBe(false);
    expect(normalized.map((def) => def.id)).toContain("archived");
  });

  it("cleans active ids when filters are hidden or unknown", () => {
    const defs = normalizeIdeaQuickFilters([
      {
        id: "recent",
        label: "Recent",
        icon: "clock",
        visible: false,
        match: "all",
        rules: [{ id: "r1", field: "builtin", operator: "is", value: "recent" }],
      },
    ]);

    expect(cleanActiveIdeaQuickFilterIds(["recent", "linked", "ghost"], defs)).toEqual([
      "linked",
    ]);
  });

  it("matches built-in predicates", () => {
    expect(matchesBuiltInIdeaQuickFilter(idea(), "recent", NOW)).toBe(true);
    expect(
      matchesBuiltInIdeaQuickFilter(
        idea({ created_at: "2026-05-01T12:00:00.000Z" }),
        "recent",
        NOW,
      ),
    ).toBe(false);
    expect(matchesBuiltInIdeaQuickFilter(idea(), "unreviewed", NOW)).toBe(true);
    expect(matchesBuiltInIdeaQuickFilter(idea({ manual_tags: ["billing"] }), "hasTags", NOW)).toBe(
      true,
    );
    expect(matchesBuiltInIdeaQuickFilter(idea(), "noTags", NOW)).toBe(true);
    expect(
      matchesBuiltInIdeaQuickFilter(idea({ linked_project_ids: ["project-1"] }), "linked", NOW),
    ).toBe(true);
    expect(matchesBuiltInIdeaQuickFilter(idea(), "unlinked", NOW)).toBe(true);
    expect(matchesBuiltInIdeaQuickFilter(idea({ status: "archived" }), "archived", NOW)).toBe(
      true,
    );
  });

  it("supports all and any rule matching", () => {
    const allDef: IdeaQuickFilterDefinition = {
      id: "custom-all",
      label: "Product checkout",
      icon: "filter",
      visible: true,
      builtIn: false,
      match: "all",
      rules: [
        { id: "r1", field: "category", operator: "is", value: "product" },
        { id: "r2", field: "text", operator: "contains", value: "stripe" },
      ],
    };
    const anyDef: IdeaQuickFilterDefinition = {
      ...allDef,
      id: "custom-any",
      match: "any",
      rules: [
        { id: "r1", field: "sourceType", operator: "is", value: "voice" },
        { id: "r2", field: "attachments", operator: "present", value: null },
      ],
    };

    expect(matchesIdeaQuickFilterDefinition(idea(), allDef, NOW)).toBe(true);
    expect(matchesIdeaQuickFilterDefinition(idea({ category: "tech" }), allDef, NOW)).toBe(
      false,
    );
    expect(
      matchesIdeaQuickFilterDefinition(idea({ attachments: [{ name: "note.png" }] }), anyDef, NOW),
    ).toBe(true);
  });
});
