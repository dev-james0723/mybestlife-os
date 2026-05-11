/**
 * Routine Composer — Flash, structured. Turns a free-text routine intent
 * ("evening wind-down, 15 minutes") into an ordered list of steps with
 * optional timers.
 */

import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const RoutineStepProposalSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
  durationSeconds: z.number().int().positive().max(7200).optional(),
});

export const RoutineComposerResponseSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  timeOfDay: z.enum(["morning", "afternoon", "evening", "anytime"]),
  totalEstimatedSeconds: z.number().int().positive().optional(),
  steps: z.array(RoutineStepProposalSchema).min(1).max(12),
  rationale: z.string().min(1).max(400),
});

export type RoutineComposerResponse = z.infer<
  typeof RoutineComposerResponseSchema
>;

export const RoutineComposerGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["name", "timeOfDay", "steps", "rationale"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    timeOfDay: {
      type: "string",
      enum: ["morning", "afternoon", "evening", "anytime"],
    },
    totalEstimatedSeconds: { type: "integer" },
    steps: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          durationSeconds: { type: "integer" },
        },
      },
    },
    rationale: { type: "string" },
  },
};

export function parseRoutineComposerResponse(
  raw: unknown,
): RoutineComposerResponse {
  return RoutineComposerResponseSchema.parse(raw);
}
