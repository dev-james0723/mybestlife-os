/**
 * Gemini response schema for the Smart Tagging prompt (spec 2.1).
 *
 * Gemini expects OpenAPI-3 subset (no `anyOf`, no `$ref`). We pair this
 * schema with the Zod validator in `lib/validators/quote.ts`.
 */

import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";
import {
  QUOTE_CATEGORY_VALUES,
  QUOTE_EMOTION_TONES,
} from "@/types/quote";

export const SmartTaggingGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["category", "tags", "emotion_tone", "confidence"],
  properties: {
    category: {
      type: "string",
      enum: [...QUOTE_CATEGORY_VALUES],
      description:
        "Exactly one category from the 30 allowed values. Pick the one the quote most clearly belongs to.",
    },
    tags: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "string",
        description:
          "A lowercase tag, 1–3 words, no hashtag. Mix concrete and abstract tags.",
      },
    },
    emotion_tone: {
      type: "string",
      enum: [...QUOTE_EMOTION_TONES],
      description: "The quote's dominant emotional register.",
    },
    confidence: {
      type: "number",
      description:
        "0–1 confidence that the tagging is correct. Drop below 0.7 only for genuinely ambiguous quotes.",
    },
    detected_language: {
      type: "string",
      description:
        "ISO language code that best matches the quote text (e.g. en, zh-TW, ja, ko, fr, es, it, vi).",
    },
  },
};
