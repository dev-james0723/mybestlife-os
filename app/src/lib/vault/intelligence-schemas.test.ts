import { describe, expect, it } from "vitest";
import {
  detectShouldAddInputKind,
  normalizeProductResearchSettings,
  shouldAddResponseSchema,
} from "@/lib/vault/intelligence-schemas";

describe("detectShouldAddInputKind", () => {
  it("detects URLs and GitHub repos", () => {
    expect(detectShouldAddInputKind("https://github.com/vercel/next.js")).toBe("github_url");
    expect(detectShouldAddInputKind("https://cursor.com/pricing")).toBe("pricing_url");
    expect(detectShouldAddInputKind("https://raycast.com")).toBe("website_url");
  });

  it("detects questions and workflow needs", () => {
    expect(detectShouldAddInputKind("Should I add Cursor Pro?")).toBe("question");
    expect(
      detectShouldAddInputKind("I need a tool to automate D Festival acceptance emails"),
    ).toBe("workflow_need");
  });
});

describe("shouldAddResponseSchema", () => {
  it("accepts a review-first recommendation payload", () => {
    const parsed = shouldAddResponseSchema.safeParse({
      recommendation: "trial_first",
      reason: "Useful, but overlap should be reviewed first.",
      overlap_with_existing_tools: [],
      tools_it_might_replace: [],
      project_relevance: [],
      fields_to_save_if_user_confirms: { app_name: "Cursor", status: "Testing" },
      sources: [],
      unknowns: ["Current price"],
      warnings: ["Review before saving"],
      generatedAt: new Date().toISOString(),
    });
    expect(parsed.success).toBe(true);
  });
});

describe("normalizeProductResearchSettings", () => {
  it("uses default toggles when settings are omitted", () => {
    expect(normalizeProductResearchSettings(undefined)).toMatchObject({
      generateAnalysisReport: true,
      generateManualIllustration: false,
      fetchIconLogo: true,
      includeSimilarProducts: true,
      includeTechnicalGithubAnalysis: "skipped",
    });
  });
});
