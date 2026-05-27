import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";
import { HabitProposalSchema, normalizeGeminiFlatProposal } from "./habit-builder";

export const SecretarySuggestionSchema = z.object({
  title: z.string().min(1).max(100),
  reason: z.string().min(1).max(360),
  actionLabel: z.string().min(1).max(40),
  sourceKind: z.string().max(40).optional(),
});

export const SecretaryBriefResponseSchema = z.object({
  greeting: z.string().min(1).max(120),
  todaySummary: z.string().min(1).max(420),
  suggestions: z.array(SecretarySuggestionSchema).min(1).max(3),
  patternNote: z.string().max(420).optional(),
});

export type SecretaryBriefResponse = z.infer<typeof SecretaryBriefResponseSchema>;

export const CrossPageHabitSuggestionSchema = HabitProposalSchema.extend({
  reason: z.string().min(1).max(420),
  difficulty: z.enum(["easy", "medium", "hard"]),
  sourceKind: z.enum([
    "goal",
    "project",
    "task",
    "daily_planner",
    "calendar_event",
    "knowledge",
    "ai_knowledge",
    "career_profile",
    "health_metric",
    "journal_pattern",
  ]),
  sourceTitle: z.string().min(1).max(140),
  visualSubject: z.string().min(1).max(220).optional(),
});

export const CrossPageSuggestionsResponseSchema = z.object({
  suggestions: z.array(CrossPageHabitSuggestionSchema).max(6).default([]),
  secretaryNote: z.string().max(420).optional(),
});

export type CrossPageSuggestionsResponse = z.infer<
  typeof CrossPageSuggestionsResponseSchema
>;
export type CrossPageHabitSuggestion = z.infer<typeof CrossPageHabitSuggestionSchema>;

export const OnboardingRecommendRequestSchema = z.object({
  improvementArea: z.string().min(1).max(80),
  supportNeed: z.string().min(1).max(120),
  realisticTime: z.string().min(1).max(80),
  effort: z.string().min(1).max(80),
  blocker: z.string().min(1).max(120),
  language: z.string().optional(),
  forceRefresh: z.boolean().optional(),
});

export const OnboardingRecommendResponseSchema = z.object({
  primary: CrossPageHabitSuggestionSchema,
  alternatives: z.array(CrossPageHabitSuggestionSchema).max(3).default([]),
  firstWeekRamp: z.array(z.string().min(1).max(160)).max(4).default([]),
  trigger: z.string().min(1).max(180),
  reminder: z.string().min(1).max(180),
  expectedFriction: z.string().min(1).max(220),
  secretaryNote: z.string().min(1).max(420),
});

export type OnboardingRecommendResponse = z.infer<
  typeof OnboardingRecommendResponseSchema
>;

export const TimerCompleteReflectionResponseSchema = z.object({
  note: z.string().min(1).max(420),
  suggestedAdjustment: z.string().max(260).optional(),
});

export type TimerCompleteReflectionResponse = z.infer<
  typeof TimerCompleteReflectionResponseSchema
>;

const flatHabitShape = {
  type: "object",
  required: [
    "name",
    "type",
    "frequencyKind",
    "timeOfDay",
    "rationale",
    "reason",
    "difficulty",
    "sourceKind",
    "sourceTitle",
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
    frequencyWeekdays: { type: "array", items: { type: "integer" } },
    frequencyEveryNDays: { type: "integer" },
    timeOfDay: {
      type: "string",
      enum: ["morning", "afternoon", "evening", "anytime"],
    },
    tags: { type: "array", items: { type: "string" } },
    rationale: { type: "string" },
    reason: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    sourceKind: {
      type: "string",
      enum: [
        "goal",
        "project",
        "task",
        "daily_planner",
        "calendar_event",
        "knowledge",
        "ai_knowledge",
        "career_profile",
        "health_metric",
        "journal_pattern",
      ],
    },
    sourceTitle: { type: "string" },
    visualSubject: { type: "string" },
  },
} satisfies Record<string, unknown>;

export const SecretaryBriefGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["greeting", "todaySummary", "suggestions"],
  properties: {
    greeting: { type: "string" },
    todaySummary: { type: "string" },
    patternNote: { type: "string" },
    suggestions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        required: ["title", "reason", "actionLabel"],
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
          actionLabel: { type: "string" },
          sourceKind: { type: "string" },
        },
      },
    },
  },
};

export const CrossPageSuggestionsGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["suggestions"],
  properties: {
    secretaryNote: { type: "string" },
    suggestions: {
      type: "array",
      maxItems: 6,
      items: flatHabitShape,
    },
  },
};

export const OnboardingRecommendGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: [
    "primary",
    "alternatives",
    "firstWeekRamp",
    "trigger",
    "reminder",
    "expectedFriction",
    "secretaryNote",
  ],
  properties: {
    primary: flatHabitShape,
    alternatives: { type: "array", maxItems: 3, items: flatHabitShape },
    firstWeekRamp: { type: "array", maxItems: 4, items: { type: "string" } },
    trigger: { type: "string" },
    reminder: { type: "string" },
    expectedFriction: { type: "string" },
    secretaryNote: { type: "string" },
  },
};

export const TimerCompleteReflectionGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["note"],
  properties: {
    note: { type: "string" },
    suggestedAdjustment: { type: "string" },
  },
};

function normalizeCrossPageSuggestion(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as Record<string, unknown>;
  return {
    ...normalizeGeminiFlatProposal(r),
    reason: r.reason,
    difficulty: r.difficulty,
    sourceKind: r.sourceKind,
    sourceTitle: r.sourceTitle,
    visualSubject: r.visualSubject,
  };
}

export function parseSecretaryBriefResponse(raw: unknown): SecretaryBriefResponse {
  return SecretaryBriefResponseSchema.parse(raw);
}

export function parseCrossPageSuggestionsResponse(
  raw: unknown,
): CrossPageSuggestionsResponse {
  if (!raw || typeof raw !== "object") {
    return CrossPageSuggestionsResponseSchema.parse(raw);
  }
  const r = raw as { suggestions?: unknown[]; secretaryNote?: unknown };
  return CrossPageSuggestionsResponseSchema.parse({
    secretaryNote: r.secretaryNote,
    suggestions: Array.isArray(r.suggestions)
      ? r.suggestions.map(normalizeCrossPageSuggestion)
      : [],
  });
}

export function parseOnboardingRecommendResponse(
  raw: unknown,
): OnboardingRecommendResponse {
  if (!raw || typeof raw !== "object") {
    return OnboardingRecommendResponseSchema.parse(raw);
  }
  const r = raw as {
    primary?: unknown;
    alternatives?: unknown[];
    firstWeekRamp?: unknown[];
    trigger?: unknown;
    reminder?: unknown;
    expectedFriction?: unknown;
    secretaryNote?: unknown;
  };
  return OnboardingRecommendResponseSchema.parse({
    primary: normalizeCrossPageSuggestion(r.primary),
    alternatives: Array.isArray(r.alternatives)
      ? r.alternatives.map(normalizeCrossPageSuggestion)
      : [],
    firstWeekRamp: r.firstWeekRamp ?? [],
    trigger: r.trigger,
    reminder: r.reminder,
    expectedFriction: r.expectedFriction,
    secretaryNote: r.secretaryNote,
  });
}

export function parseTimerCompleteReflectionResponse(
  raw: unknown,
): TimerCompleteReflectionResponse {
  return TimerCompleteReflectionResponseSchema.parse(raw);
}
