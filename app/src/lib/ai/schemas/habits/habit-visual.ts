import { z } from "zod";

export const HabitVisualRequestSchema = z.object({
  habitId: z.string().uuid().optional(),
  routineId: z.string().uuid().optional(),
  habitName: z.string().min(1).max(160),
  description: z.string().max(500).nullable().optional(),
  type: z.enum(["checkbox", "counter", "duration", "negative"]).optional(),
  timeOfDay: z.enum(["morning", "afternoon", "evening", "anytime"]).optional(),
  sourceContext: z.string().max(800).optional(),
  forceRefresh: z.boolean().optional(),
});

export const HabitVisualResponseSchema = z.object({
  imageUrl: z.string().url(),
  storagePath: z.string(),
  prompt: z.string(),
  modelUsed: z.string(),
  cached: z.boolean(),
});

export type HabitVisualRequest = z.infer<typeof HabitVisualRequestSchema>;
export type HabitVisualResponse = z.infer<typeof HabitVisualResponseSchema>;
