/**
 * Habit Builder — Flash, structured.
 *
 * Input: a short free-text intent ("read more", "stop scrolling").
 * Output: one fully-specified habit proposal plus 1–3 alternatives the user
 * can skim through, plus 2–3 tiny "first-week ramp" adjustments.
 *
 * The Gemini `responseSchema` below intentionally mirrors the Zod schema but
 * uses Gemini's OpenAPI-3 subset dialect (no `anyOf`, no `discriminator`).
 * Frequency is encoded as four optional top-level fields + a `frequencyKind`
 * tag so the discriminated union can be reassembled on the server.
 */

import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const HabitFrequencySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("daily") }),
  z.object({
    kind: z.literal("weekly_count"),
    count: z.number().int().min(1).max(7),
  }),
  z.object({
    kind: z.literal("weekdays"),
    days: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(7),
  }),
  z.object({
    kind: z.literal("every_n_days"),
    n: z.number().int().min(2).max(30),
  }),
]);

export const HabitProposalSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  type: z.enum(["checkbox", "counter", "duration", "negative"]),
  targetValue: z.number().positive().optional(),
  frequency: HabitFrequencySchema,
  timeOfDay: z.enum(["morning", "afternoon", "evening", "anytime"]),
  tags: z.array(z.string().min(1).max(32)).max(6).default([]),
  rationale: z.string().min(1).max(400),
});

export const HabitBuilderResponseSchema = z.object({
  primary: HabitProposalSchema,
  alternatives: z.array(HabitProposalSchema).max(3).default([]),
  firstWeekRamp: z.array(z.string().min(1).max(160)).max(3).default([]),
});

export type HabitBuilderResponse = z.infer<typeof HabitBuilderResponseSchema>;
export type HabitProposal = z.infer<typeof HabitProposalSchema>;

/**
 * Gemini response schema. Uses the flat frequency shape described above,
 * which we reassemble via {@link parseHabitBuilderResponse}.
 */
export const HabitBuilderGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["primary", "alternatives", "firstWeekRamp"],
  properties: {
    primary: habitProposalGeminiShape(),
    alternatives: {
      type: "array",
      maxItems: 3,
      items: habitProposalGeminiShape(),
    },
    firstWeekRamp: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
  },
};

function habitProposalGeminiShape(): Record<string, unknown> {
  return {
    type: "object",
    required: ["name", "type", "frequencyKind", "timeOfDay", "rationale"],
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
    },
  };
}

/** Reassemble the flat Gemini output into the discriminated Zod shape. */
export function parseHabitBuilderResponse(raw: unknown): HabitBuilderResponse {
  const normalized = normalizeRawResponse(raw);
  return HabitBuilderResponseSchema.parse(normalized);
}

export type FlatProposal = {
  name?: unknown;
  description?: unknown;
  type?: unknown;
  targetValue?: unknown;
  frequencyKind?: unknown;
  frequencyWeeklyCount?: unknown;
  frequencyWeekdays?: unknown;
  frequencyEveryNDays?: unknown;
  timeOfDay?: unknown;
  tags?: unknown;
  rationale?: unknown;
  frequency?: unknown;
};

/** Re-map flat `frequencyKind` fields from a Gemini habit proposal object. */
export function normalizeGeminiFlatProposal(p: unknown): Record<string, unknown> {
  if (!p || typeof p !== "object") return {};
  return normalizeProposal(p as FlatProposal);
}

function normalizeProposal(p: FlatProposal): Record<string, unknown> {
  let frequency: unknown = p.frequency;
  if (!frequency) {
    switch (p.frequencyKind) {
      case "daily":
        frequency = { kind: "daily" };
        break;
      case "weekly_count":
        frequency = {
          kind: "weekly_count",
          count: Number(p.frequencyWeeklyCount ?? 3),
        };
        break;
      case "weekdays":
        frequency = {
          kind: "weekdays",
          days: Array.isArray(p.frequencyWeekdays)
            ? p.frequencyWeekdays
            : [1, 2, 3, 4, 5],
        };
        break;
      case "every_n_days":
        frequency = {
          kind: "every_n_days",
          n: Number(p.frequencyEveryNDays ?? 2),
        };
        break;
      default:
        frequency = { kind: "daily" };
    }
  }
  return {
    name: p.name,
    description: p.description,
    type: p.type,
    targetValue: p.targetValue,
    frequency,
    timeOfDay: p.timeOfDay,
    tags: p.tags,
    rationale: p.rationale,
  };
}

function normalizeRawResponse(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as {
    primary?: FlatProposal;
    alternatives?: FlatProposal[];
    firstWeekRamp?: unknown[];
  };
  return {
    primary: r.primary ? normalizeProposal(r.primary) : undefined,
    alternatives: Array.isArray(r.alternatives)
      ? r.alternatives.map(normalizeProposal)
      : [],
    firstWeekRamp: r.firstWeekRamp ?? [],
  };
}
