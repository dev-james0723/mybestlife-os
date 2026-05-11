/**
 * Struggle Detection — Pro, structured. Given a habit's recent completion
 * history and notes, identify which habits are wobbling, why, and one small
 * course correction per habit. Observational voice only — no motivational
 * filler, no "you can do it!" language.
 */

import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const StrugglingHabitSchema = z.object({
  habitId: z.string().uuid(),
  habitName: z.string().min(1).max(80),
  /** 0..1 — how much this habit is struggling. 1 = completely stalled. */
  severity: z.number().min(0).max(1),
  pattern: z.string().min(1).max(400),
  /** The smallest change that might restore momentum. */
  suggestedAdjustment: z.string().min(1).max(400),
  adjustmentKind: z.enum([
    "reduce_frequency",
    "reduce_target",
    "change_time_of_day",
    "pair_with_anchor",
    "pause_one_week",
    "none",
  ]),
});

export const StruggleDetectionResponseSchema = z.object({
  struggling: z.array(StrugglingHabitSchema).max(5),
  overallObservation: z.string().min(1).max(500),
});

export type StruggleDetectionResponse = z.infer<
  typeof StruggleDetectionResponseSchema
>;

export function parseStruggleDetectionResponse(
  raw: unknown,
): StruggleDetectionResponse {
  return StruggleDetectionResponseSchema.parse(raw);
}

export const StruggleDetectionGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["struggling", "overallObservation"],
  properties: {
    struggling: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        required: [
          "habitId",
          "habitName",
          "severity",
          "pattern",
          "suggestedAdjustment",
          "adjustmentKind",
        ],
        properties: {
          habitId: { type: "string" },
          habitName: { type: "string" },
          severity: { type: "number" },
          pattern: { type: "string" },
          suggestedAdjustment: { type: "string" },
          adjustmentKind: {
            type: "string",
            enum: [
              "reduce_frequency",
              "reduce_target",
              "change_time_of_day",
              "pair_with_anchor",
              "pause_one_week",
              "none",
            ],
          },
        },
      },
    },
    overallObservation: { type: "string" },
  },
};
