/**
 * Gemini response schema for Source Intelligence enrichment (spec 2.6).
 */

import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const SourceIntelligenceGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["author_bio", "historical_context", "related_quotes", "confidence", "unverified"],
  properties: {
    author_bio: {
      type: "string",
      description:
        "2–4 sentence factual biography of the author tied to the quote. If the author is unknown or cannot be verified from the research notes, return empty string and set unverified = true.",
    },
    historical_context: {
      type: "string",
      description:
        "2–4 sentences on when/why the author said or wrote this line. Same rules as author_bio.",
    },
    related_quotes: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description:
              "Another confirmed quote by the same author, 5–280 characters.",
          },
          source: {
            type: "string",
            description: "Book / essay / speech title and year if known.",
          },
        },
        required: ["text"],
      },
    },
    confidence: {
      type: "number",
      description:
        "0–1 confidence in the research. Never fabricate — mark unverified and set bio/context to empty string when confidence drops below 0.5.",
    },
    unverified: {
      type: "boolean",
      description:
        "True when any field could not be confirmed from the search results.",
    },
  },
};
