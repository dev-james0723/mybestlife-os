import { describe, expect, it } from "vitest";

import {
  buildWizardSynthesisUserMessage,
  reconcilePromptVariables,
  type PromptWizardSynthesisInput,
} from "@/lib/ai/prompt-wizard-synthesize";

describe("AI Knowledge conversational wizard synthesis", () => {
  it("serializes only the visible conversational answers", () => {
    const state: PromptWizardSynthesisInput = {
      goalOrRoughPrompt: "Improve this rough prompt",
      context: "For a first-time manager",
      outputFormat: "Return a checklist",
      toneStyle: ["clear", "warm"],
    };

    const message = buildWizardSynthesisUserMessage(state, "en");

    expect(JSON.parse(message)).toEqual({
      appLocale: "en",
      goalOrRoughPrompt: "Improve this rough prompt",
      context: "For a first-time manager",
      outputFormat: "Return a checklist",
      toneStyle: "clear, warm",
    });
  });

  it("aligns generated variable metadata with the edited prompt body", () => {
    const variables = reconcilePromptVariables(
      "Compare {existing_topic} with {new_topic}, then revisit {existing_topic}.",
      [
        {
          name: "existing_topic",
          label: "Existing topic",
          description: "The original subject",
          required: false,
          example: "Music theory",
        },
        {
          name: "removed_topic",
          label: "Removed topic",
          description: null,
          required: true,
          example: null,
        },
      ],
    );

    expect(variables).toEqual([
      {
        name: "existing_topic",
        label: "Existing topic",
        description: "The original subject",
        required: false,
        example: "Music theory",
      },
      {
        name: "new_topic",
        label: null,
        description: null,
        required: true,
        example: null,
      },
    ]);
  });
});
