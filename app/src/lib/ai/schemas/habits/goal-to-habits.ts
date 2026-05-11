/**
 * Goal → Habits — Flash, structured. Given a goal (and optional key results),
 * propose 3–5 habits that would actually make progress toward it. Each habit
 * comes with an evidence-light explanation of *why* this habit serves the goal.
 */

import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";
import {
  HabitProposalSchema,
  normalizeGeminiFlatProposal,
  type HabitProposal,
} from "./habit-builder";

export const GoalToHabitsResponseSchema = z.object({
  habits: z
    .array(
      HabitProposalSchema.extend({
        whyThisHabit: z.string().min(1).max(400),
        estimatedTimePerCycle: z.string().max(60).optional(),
      }),
    )
    .min(1)
    .max(5),
  compositionNotes: z.string().max(600).optional(),
});

export type GoalToHabitsResponse = z.infer<typeof GoalToHabitsResponseSchema>;
export type GoalToHabitsItem = GoalToHabitsResponse["habits"][number] &
  HabitProposal;

export function parseGoalToHabitsResponse(raw: unknown): GoalToHabitsResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("goal_to_habits_invalid_shape");
  }
  const r = raw as { habits?: unknown[]; compositionNotes?: unknown };
  const habits = Array.isArray(r.habits)
    ? r.habits.map((item) => {
        const base = normalizeGeminiFlatProposal(item);
        const ex =
          item && typeof item === "object"
            ? (item as Record<string, unknown>)
            : {};
        return {
          ...base,
          whyThisHabit: ex.whyThisHabit,
          estimatedTimePerCycle: ex.estimatedTimePerCycle,
        };
      })
    : [];
  return GoalToHabitsResponseSchema.parse({
    habits,
    compositionNotes: r.compositionNotes,
  });
}

export const GoalToHabitsGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["habits"],
  properties: {
    habits: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        required: [
          "name",
          "type",
          "frequencyKind",
          "timeOfDay",
          "rationale",
          "whyThisHabit",
        ],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          type: {
            type: "string",
            enum: ["checkbox", "counter", "duration", "negative"],
          },
          targetValue: { type: "number" },
          frequencyKind: {
            type: "string",
            enum: ["daily", "weekly_count", "weekdays", "every_n_days"],
          },
          frequencyWeeklyCount: { type: "integer" },
          frequencyWeekdays: {
            type: "array",
            items: { type: "integer" },
          },
          frequencyEveryNDays: { type: "integer" },
          timeOfDay: {
            type: "string",
            enum: ["morning", "afternoon", "evening", "anytime"],
          },
          tags: { type: "array", items: { type: "string" } },
          rationale: { type: "string" },
          whyThisHabit: { type: "string" },
          estimatedTimePerCycle: { type: "string" },
        },
      },
    },
    compositionNotes: { type: "string" },
  },
};
