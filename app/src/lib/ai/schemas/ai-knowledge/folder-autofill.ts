/**
 * Gemini structured response for auto-naming a prompt folder from the prompts
 * the user selected to put inside it.
 */

import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const FolderAutofillGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["name", "summary", "icon"],
  properties: {
    name: {
      type: "string",
      description:
        "Short, human-readable folder title (max ~40 chars). No quotes, no trailing punctuation.",
    },
    summary: {
      type: "string",
      description:
        "One sentence describing what this folder collects / when to reach for it.",
    },
    icon: {
      type: "string",
      description:
        "A single emoji that best represents the theme shared by these prompts.",
    },
  },
};
