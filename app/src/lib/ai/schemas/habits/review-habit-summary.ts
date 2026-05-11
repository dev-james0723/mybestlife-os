/**
 * Review-a-Habit summary — Pro, structured. The streaming "review this habit"
 * flow generates prose on the fly; this schema captures the structured
 * *summary* produced at the end (used by the detail drawer to display
 * actionable headlines without re-rendering the full prose).
 */

import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const ReviewHabitSummarySchema = z.object({
  whatWorked: z.array(z.string().min(1).max(200)).max(5).default([]),
  whatDidnt: z.array(z.string().min(1).max(200)).max(5).default([]),
  /** The single most important recommendation — kept narrow on purpose. */
  oneThingToTry: z.string().min(1).max(200),
  /** Difficult truths the model observed (observational voice: facts, not judgements). */
  difficultTruths: z.array(z.string().min(1).max(240)).max(3).default([]),
  /** Optional risk: is this habit worth keeping? */
  continueRecommendation: z.enum(["keep", "adjust", "pause", "retire"]),
  recommendationReason: z.string().min(1).max(400),
});

export type ReviewHabitSummary = z.infer<typeof ReviewHabitSummarySchema>;

/** Single structured Gemini response: long-form review + scannable summary. */
export const ReviewHabitFullResponseSchema = ReviewHabitSummarySchema.extend({
  prose: z.string().min(20).max(12_000),
});

export type ReviewHabitFullResponse = z.infer<typeof ReviewHabitFullResponseSchema>;

export function parseReviewHabitFullResponse(raw: unknown): ReviewHabitFullResponse {
  return ReviewHabitFullResponseSchema.parse(raw);
}

export const ReviewHabitSummaryGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["oneThingToTry", "continueRecommendation", "recommendationReason"],
  properties: {
    whatWorked: { type: "array", items: { type: "string" }, maxItems: 5 },
    whatDidnt: { type: "array", items: { type: "string" }, maxItems: 5 },
    oneThingToTry: { type: "string" },
    difficultTruths: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
    },
    continueRecommendation: {
      type: "string",
      enum: ["keep", "adjust", "pause", "retire"],
    },
    recommendationReason: { type: "string" },
  },
};

export const ReviewHabitFullGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: [
    "prose",
    "oneThingToTry",
    "continueRecommendation",
    "recommendationReason",
  ],
  properties: {
    prose: { type: "string" },
    whatWorked: { type: "array", items: { type: "string" }, maxItems: 5 },
    whatDidnt: { type: "array", items: { type: "string" }, maxItems: 5 },
    oneThingToTry: { type: "string" },
    difficultTruths: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
    },
    continueRecommendation: {
      type: "string",
      enum: ["keep", "adjust", "pause", "retire"],
    },
    recommendationReason: { type: "string" },
  },
};
