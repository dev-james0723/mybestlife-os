import { describe, expect, it } from "vitest";
import type { RoleModelNeuralSkill } from "@/types/role-model-intelligence";
import { neuralSkillToMindSkill } from "./use-role-model-neural-skills";

describe("neuralSkillToMindSkill", () => {
  it("preserves lens-specific starter prompts for the chat interface", () => {
    const neuralSkill: RoleModelNeuralSkill = {
      id: "skill-row-1",
      user_id: "user-1",
      role_model_id: "role-model-1",
      mind_skill_id: "custom-rm-role-model-1",
      skill_json: {
        lensTitle: "Systems Lens",
        lensSubtitle: "Look for leverage.",
        systemPromptHint: "Think in systems.",
        thinkingStyle: "Systems-first",
        decisionPrinciples: ["Find leverage"],
        communicationStyle: "Direct",
        likelyQuestions: ["Where is the bottleneck?"],
        bestFor: ["Complex decisions"],
        avoidFor: ["Private facts"],
        blindSpots: ["May over-abstract"],
        starterPrompts: ["Where is the hidden bottleneck?", "What can I simplify?"],
      },
      avatar_gradient: ["#0f766e", "#5eead4"],
      status: "ready",
      model_used: "test-model",
      created_at: "2026-09-03T00:00:00.000Z",
      updated_at: "2026-09-03T00:00:00.000Z",
    };

    expect(neuralSkillToMindSkill(neuralSkill).starterPrompts).toEqual([
      "Where is the hidden bottleneck?",
      "What can I simplify?",
    ]);
  });
});
