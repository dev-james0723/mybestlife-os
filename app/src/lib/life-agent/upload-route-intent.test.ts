import { describe, expect, it } from "vitest";
import { buildUploadSuggestionsForIntent } from "@/lib/life-agent/upload-route-intent";
import type { LifeAgentUploadAnalysis } from "@/lib/life-agent/upload-types";

const baseAnalysis = (): LifeAgentUploadAnalysis => ({
  detectedType: "business_card",
  summary: "Card for Alex Chen — follow up about festival.",
  confidence: 0.85,
  warnings: [],
  suggestedActions: [],
  extractedTasks: [{ title: "Email Alex about timeline" }],
  extractedRelationshipUpdate: {
    name_hint: "Alex Chen",
    next_action: "Send festival timeline",
  },
});

describe("buildUploadSuggestionsForIntent", () => {
  it("creates task previews for extract_tasks", () => {
    const suggestions = buildUploadSuggestionsForIntent(baseAnalysis(), "extract_tasks");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]?.type).toBe("create_task");
  });

  it("creates note preview for save_as_note", () => {
    const suggestions = buildUploadSuggestionsForIntent(baseAnalysis(), "save_as_note");
    expect(suggestions[0]?.type).toBe("create_note");
  });

  it("uses note fallback when relationship id unknown", () => {
    const suggestions = buildUploadSuggestionsForIntent(
      baseAnalysis(),
      "update_relationship",
    );
    expect(suggestions[0]?.type).toBe("create_note");
    expect(suggestions[0]?.title).toMatch(/Alex/i);
  });
});
