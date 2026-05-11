/**
 * Correlation Insight — Pro, structured. Given two or more habits' histories
 * (and optional cross-domain signals: sleep, mood, time-tracking), name any
 * pattern connecting them. Lean heavily on falsifiable descriptions; explicitly
 * prefer "I don't see a meaningful pattern" over speculation.
 */

import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const CorrelationSchema = z.object({
  /** Short headline, <= 12 words. */
  title: z.string().min(1).max(80),
  direction: z.enum(["positive", "negative", "no_pattern"]),
  /** 0..1 confidence the user can see in a tooltip. */
  confidence: z.number().min(0).max(1),
  /** Which habits / signals this correlation spans (names, not ids, for UX). */
  subjects: z.array(z.string().min(1).max(80)).min(2).max(6),
  observation: z.string().min(1).max(500),
  /** Concrete things the user can try this week to test / use the pattern. */
  suggestedExperiments: z.array(z.string().min(1).max(200)).max(3).default([]),
});

export const CorrelationInsightResponseSchema = z.object({
  correlations: z.array(CorrelationSchema).max(4),
  dataLimitations: z.string().max(400).optional(),
});

export type CorrelationInsightResponse = z.infer<
  typeof CorrelationInsightResponseSchema
>;

export function parseCorrelationInsightResponse(
  raw: unknown,
): CorrelationInsightResponse {
  return CorrelationInsightResponseSchema.parse(raw);
}

export const CorrelationInsightGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["correlations"],
  properties: {
    correlations: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        required: [
          "title",
          "direction",
          "confidence",
          "subjects",
          "observation",
        ],
        properties: {
          title: { type: "string" },
          direction: {
            type: "string",
            enum: ["positive", "negative", "no_pattern"],
          },
          confidence: { type: "number" },
          subjects: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: { type: "string" },
          },
          observation: { type: "string" },
          suggestedExperiments: {
            type: "array",
            maxItems: 3,
            items: { type: "string" },
          },
        },
      },
    },
    dataLimitations: { type: "string" },
  },
};
