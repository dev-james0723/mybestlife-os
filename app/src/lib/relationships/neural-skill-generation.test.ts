import { describe, expect, it } from "vitest";
import type {
  NeuralSkillContent,
  RoleModelNeuralSkill,
} from "@/types/role-model-intelligence";
import {
  NeuralSkillGenerationError,
  buildNeuralSkillSystemPrompt,
  formatNeuralSkillGenerationError,
  mergeNeuralSkillIntoCache,
  neuralSkillFallbackNotice,
  readNeuralSkillApiResponse,
  wrapNeuralSkillGenerationError,
} from "./neural-skill-generation";

const content: NeuralSkillContent = {
  lensTitle: "Test Lens",
  lensSubtitle: "Test",
  systemPromptHint: "Never claim to be Test Person.",
  thinkingStyle: "Evidence first.",
  decisionPrinciples: ["Test assumptions"],
  communicationStyle: "Concise",
  likelyQuestions: ["Why?"],
  bestFor: ["Testing"],
  avoidFor: ["Impersonation"],
  blindSpots: ["Limited evidence"],
  starterPrompts: ["Help me test this."],
};

function row(partial: Partial<RoleModelNeuralSkill> = {}): RoleModelNeuralSkill {
  return {
    id: "skill-row-1",
    user_id: "user-1",
    role_model_id: "role-model-1",
    mind_skill_id: "custom-rm-role-model-1",
    skill_json: content,
    avatar_gradient: ["#000000", "#ffffff"],
    status: "ready",
    model_used: "gemini-2.5-flash",
    created_at: "2026-09-03T00:00:00.000Z",
    updated_at: "2026-09-03T00:00:00.000Z",
    ...partial,
  };
}

describe("readNeuralSkillApiResponse", () => {
  it("preserves generation metadata and a profile-fallback warning", async () => {
    const parsed = await readNeuralSkillApiResponse(
      new Response(
        JSON.stringify({
          result: content,
          meta: { modelUsed: "profile-fallback", generationMode: "profile_fallback" },
          warning: { code: "profile_fallback", reason: "quota" },
        }),
        { status: 200 },
      ),
    );

    expect(parsed.result).toEqual(content);
    expect(parsed.meta?.modelUsed).toBe("profile-fallback");
    expect(parsed.warning?.reason).toBe("quota");
  });

  it("keeps the server error code and detail for a 502", async () => {
    await expect(
      readNeuralSkillApiResponse(
        new Response(
          JSON.stringify({ error: "ai_generation_failed", detail: "gemini_http_429" }),
          { status: 502 },
        ),
      ),
    ).rejects.toMatchObject({
      stage: "generate",
      code: "ai_generation_failed",
      status: 502,
      detail: "gemini_http_429",
    });
  });

  it("turns a non-JSON gateway failure into a typed error", async () => {
    await expect(
      readNeuralSkillApiResponse(new Response("Gateway timeout", { status: 504 })),
    ).rejects.toMatchObject({ stage: "generate", code: "http_504", status: 504 });
  });
});

describe("Neural Skill persistence and messaging", () => {
  it("distinguishes a persistence failure from generation", () => {
    const failure = wrapNeuralSkillGenerationError(
      { code: "PGRST205", message: "table unavailable" },
      "persist",
    );

    expect(failure).toBeInstanceOf(NeuralSkillGenerationError);
    expect(failure.stage).toBe("persist");
    expect(formatNeuralSkillGenerationError(failure)).toContain("storage is not ready");
  });

  it("merges a saved row synchronously and idempotently before navigation", () => {
    const stale = row({ id: "old", model_used: "old-model" });
    const unrelated = row({ id: "other", role_model_id: "role-model-2" });
    const saved = row({ id: "new", model_used: "gemini-2.5-flash" });

    const first = mergeNeuralSkillIntoCache([stale, unrelated], saved);
    const second = mergeNeuralSkillIntoCache(first, saved);

    expect(first.map((item) => item.id)).toEqual(["new", "other"]);
    expect(second.map((item) => item.id)).toEqual(["new", "other"]);
  });

  it("clearly labels a profile-only success", () => {
    expect(neuralSkillFallbackNotice("profile-fallback")).toContain("saved profile");
    expect(neuralSkillFallbackNotice("gemini-2.5-flash")).toBeNull();
  });

  it("feeds principles and honest boundaries into the eventual chat prompt", () => {
    const prompt = buildNeuralSkillSystemPrompt(content);

    expect(prompt).toContain("Decision heuristics:\n- Test assumptions");
    expect(prompt).toContain("Communication DNA:\nConcise");
    expect(prompt).toContain("Blind spots and honest boundaries:\n- Limited evidence");
  });

  it("does not break Mind Council when a legacy saved lens is missing arrays", () => {
    const legacy = {
      ...content,
      decisionPrinciples: undefined,
      likelyQuestions: undefined,
      bestFor: undefined,
      avoidFor: undefined,
      blindSpots: undefined,
    } as unknown as NeuralSkillContent;

    expect(() => buildNeuralSkillSystemPrompt(legacy)).not.toThrow();
    expect(buildNeuralSkillSystemPrompt(legacy)).toContain("Never claim to be Test Person");
  });
});
