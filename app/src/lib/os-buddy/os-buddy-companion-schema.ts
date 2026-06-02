import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";
import { OS_BUDDY_COMPANION_KINDS } from "./os-buddy-companion";

const CompanionKindSchema = z.enum(OS_BUDDY_COMPANION_KINDS);
const MiniGameSchema = z.enum(["pixel-catch", "focus-tap", "clean-desk"]);

const CompactScheduleItemSchema = z.object({
  title: z.string().max(120),
  sourceType: z.string().max(40),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  overdue: z.boolean().optional(),
  priority: z.string().nullable().optional(),
});

const CompactContextSchema = z.object({
  locale: z.string().max(16),
  buddyName: z.string().max(40),
  today: z.string().max(20),
  schedule: z.object({
    load: z.string().nullable(),
    itemCount: z.number().int().min(0).max(100),
    overdueCount: z.number().int().min(0).max(100),
    scheduledMinutes: z.number().int().min(0).max(1440),
    freeWindows: z.array(z.string().max(80)).max(5),
    items: z.array(CompactScheduleItemSchema).max(8),
  }),
  weather: z
    .object({
      status: z.enum(["ok", "error", "loading"]),
      location: z.string().max(80).optional(),
      temperature: z.number().optional(),
      condition: z.string().max(80).optional(),
      rainChance: z.number().min(0).max(100).optional(),
      alertLevel: z.enum(["minor", "moderate", "severe"]).nullable().optional(),
      alertKey: z.string().max(40).nullable().optional(),
    })
    .nullable(),
  quotes: z
    .array(
      z.object({
        text: z.string().max(220),
        author: z.string().max(100).nullable(),
        favorite: z.boolean().optional(),
      }),
    )
    .max(12),
  memories: z.object({
    journal: z.array(z.string().max(120)).max(6),
    ideas: z.array(z.string().max(120)).max(8),
    gratefulThings: z.array(z.string().max(120)).max(8),
  }),
  games: z.array(MiniGameSchema).max(3),
});

export const OSBuddyCompanionRequestSchema = z.object({
  kind: CompanionKindSchema,
  context: CompactContextSchema,
});

export const OSBuddyCompanionResponseSchema = z.object({
  message: z.string().trim().min(1).max(220),
  kind: CompanionKindSchema,
  source: z.enum(["ai", "local", "fallback"]),
  cta: z
    .object({
      label: z.string().trim().min(1).max(40),
      game: MiniGameSchema,
    })
    .nullable()
    .optional(),
});

export const OS_BUDDY_COMPANION_GEMINI_SCHEMA: GeminiResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    kind: { type: "string", enum: OS_BUDDY_COMPANION_KINDS },
    cta: {
      type: "object",
      properties: {
        label: { type: "string" },
        game: { type: "string", enum: ["pixel-catch", "focus-tap", "clean-desk"] },
      },
    },
  },
  required: ["message", "kind"],
};

export type OSBuddyCompanionRequest = z.infer<typeof OSBuddyCompanionRequestSchema>;
export type OSBuddyCompanionValidatedResponse = z.infer<typeof OSBuddyCompanionResponseSchema>;
