import { describe, expect, it } from "vitest";
import {
  computeNeedsConfirmation,
  mergeFieldConfidence,
  normalizeTags,
  vaultAutofillExtractionSchema,
} from "@/lib/vault/autofill-v2";

const baseExtraction = {
  app_name: "Cursor",
  category: "IDE",
  platforms: "macOS, Windows",
  use_cases: "AI-assisted coding",
  summary: "AI-first code editor",
  best_feature: "Strong autocomplete",
  biggest_downside: "Subscription cost",
  best_alternative: "VS Code",
  replaces: "Manual boilerplate editing",
  default_tool_for: "Daily application development",
  tags: ["IDE", "AI", "editor"],
  why_i_use_it: "Faster iteration on features",
  cost_type: "Subscription" as const,
};

describe("vaultAutofillExtractionSchema", () => {
  it("accepts a complete extraction payload", () => {
    const parsed = vaultAutofillExtractionSchema.safeParse(baseExtraction);
    expect(parsed.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const parsed = vaultAutofillExtractionSchema.safeParse({
      ...baseExtraction,
      summary: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("computeNeedsConfirmation", () => {
  it("flags blank and needs_user_confirmation fields", () => {
    const needs = computeNeedsConfirmation(
      { ...baseExtraction, category: "" },
      { category: "needs_user_confirmation", app_name: "high" },
    );
    expect(needs).toContain("category");
    expect(needs).not.toContain("app_name");
  });
});

describe("mergeFieldConfidence", () => {
  it("marks needs list as needs_user_confirmation", () => {
    const merged = mergeFieldConfidence(
      { ...baseExtraction, field_confidence: { app_name: "high" } },
      ["category"],
    );
    expect(merged.category).toBe("needs_user_confirmation");
    expect(merged.app_name).toBe("high");
  });
});

describe("normalizeTags", () => {
  it("dedupes and joins tag arrays", () => {
    expect(normalizeTags(["IDE", "ide", "AI", "AI"])).toBe("IDE, AI");
  });
});
