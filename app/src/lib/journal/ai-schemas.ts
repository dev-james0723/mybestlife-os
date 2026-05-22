/**
 * Gemini `responseSchema` definitions for the journal AI endpoints. These
 * are plain JSON-Schema-ish objects that Gemini's structured output mode
 * understands. The endpoints additionally validate the parsed response with
 * the zod schemas in `lib/journal/schema.ts` and the helpers below.
 */

import { z } from "zod";

import { aiOutputSchema } from "./schema";

export const SUMMARY_GEMINI_SCHEMA = {
  type: "object",
  required: ["journalEntry", "emotionalRead", "suggestions", "earnedAppreciation"],
  properties: {
    journalEntry: { type: "string" },
    emotionalRead: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 5,
    },
    suggestions: {
      type: "object",
      required: ["coping", "practical", "reframeQuestion"],
      properties: {
        coping: { type: "string" },
        practical: { type: "string" },
        reframeQuestion: { type: "string" },
      },
    },
    earnedAppreciation: { type: "string" },
  },
} as const;

export const AUDIO_SCRIPT_GEMINI_SCHEMA = {
  type: "object",
  required: ["script", "quotes"],
  properties: {
    script: { type: "string" },
    quotes: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 3,
    },
  },
} as const;

export const audioScriptResponseSchema = z.object({
  script: z.string().min(1),
  quotes: z.tuple([z.string(), z.string(), z.string()]),
});
export type AudioScriptResponse = z.infer<typeof audioScriptResponseSchema>;

export { aiOutputSchema };
