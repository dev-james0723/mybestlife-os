/**
 * Gemini structured response for inferring custom-prompt metadata from body text.
 */

import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";
import { PROMPT_TOP_CATEGORIES } from "@/types/prompt";

export const PromptMetadataGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["tags", "top_category", "short_description"],
  properties: {
    tags: {
      type: "array",
      minItems: 2,
      maxItems: 10,
      items: {
        type: "string",
        description:
          "Lowercase tag, 1–3 words, ASCII preferred. Concrete topics from the prompt.",
      },
    },
    top_category: {
      type: "string",
      enum: [...PROMPT_TOP_CATEGORIES],
      description: "Single best-matching top-level category slug.",
    },
    short_description: {
      type: "string",
      description:
        "One or two sentences summarizing what the prompt does. No quotes.",
    },
    suggested_title: {
      type: "string",
      description:
        "Short human-readable title (max ~80 chars) if the body implies one; otherwise a concise label.",
    },
  },
};
