import { describe, expect, it } from "vitest";
import {
  NeuralSkillContentZ,
  buildDistillPrompt,
  buildDistillResearchPrompt,
  buildProfileNeuralSkillFallback,
  coerceNeuralSkillContent,
  parseInsightContext,
} from "./_shared-intelligence";
import type { RoleModelInsightContextPayload } from "@/types/role-model-intelligence";

function contextFor(name: string): RoleModelInsightContextPayload {
  return {
    roleModel: {
      id: "00000000-0000-0000-0000-000000000001",
      name,
      category: "Teacher",
      bio: null,
      tags: [],
      quotes: [],
      keyLessons: [],
    },
    projects: [],
    goals: [],
    tasks: [],
    notes: [],
    ideas: [],
    otherRoleModels: [],
  };
}

describe("Nuwa-aligned Neural Skill distillation", () => {
  it.each([
    "Justin Bieber",
    "宮崎駿",
    'Dwayne "The Rock" Johnson',
    "My high-school teacher",
  ])("builds a valid evidence-bound fallback for %s", (name) => {
    const result = buildProfileNeuralSkillFallback(contextFor(name));

    expect(NeuralSkillContentZ.safeParse(result).success).toBe(true);
    expect(result.systemPromptHint).toContain(`Never claim to be ${name}`);
    expect(result.blindSpots.length).toBeGreaterThanOrEqual(3);
    expect(result.decisionPrinciples.length).toBeGreaterThanOrEqual(4);
    expect(result.lensTitle.length).toBeLessThanOrEqual(120);
  });

  it("routes research toward thinking patterns, identity checks, and honest limits", () => {
    const ctx = {
      ...contextFor("An Ambiguous Name"),
      projects: [{ id: "private-project", title: "Private launch plan" }],
    };
    const research = buildDistillResearchPrompt(ctx, "en");
    const synthesis = buildDistillPrompt(ctx, "en", { hasGroundedResearch: true });

    expect(research).toContain("HOW An Ambiguous Name");
    expect(research).toContain("Never merge namesakes");
    expect(research).toContain("first-party evidence");
    expect(research).not.toContain("Private launch plan");
    expect(research).toContain("do not search for or expose any information about the Life OS user");
    expect(synthesis).toContain("3-7 distinctive mental models");
    expect(synthesis).toContain("Preserve contradictions");
    expect(synthesis).toContain("Never predict the person's private beliefs");
  });

  it("rejects an empty or whitespace-only role-model name", () => {
    expect(parseInsightContext({ roleModel: { id: "1", name: "   " } })).toBeNull();
  });

  it("clamps verbose model output before strict validation", () => {
    const verbose = {
      ...buildProfileNeuralSkillFallback(contextFor("Verbose Person")),
      decisionPrinciples: Array.from({ length: 12 }, () => "x".repeat(400)),
      avoidFor: ["y".repeat(300), "z".repeat(300)],
    };

    const parsed = NeuralSkillContentZ.safeParse(coerceNeuralSkillContent(verbose));

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.decisionPrinciples).toHaveLength(8);
    expect(parsed.data.decisionPrinciples.every((item) => item.length <= 200)).toBe(true);
    expect(parsed.data.avoidFor.every((item) => item.length <= 120)).toBe(true);
  });
});
