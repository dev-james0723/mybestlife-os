import { z } from "zod";

import {
  ALL_EMOTIONS,
  ASPECT_RATIOS,
  EMOTION_LISTS,
  ILLUSTRATION_STYLE_PRESETS,
  NEEDS,
  QUADRANTS,
  TARGETS,
  TOPICS,
  TTS_VOICES,
  type Quadrant,
  type Topic,
} from "./constants";
import { TOPIC_CONFIG } from "./topic-config";

// ============================================================
// Primitive enums
// ============================================================

export const topicEnum = z.enum(TOPICS);
export const quadrantEnum = z.enum(QUADRANTS);
export const targetEnum = z.enum(TARGETS);
export const needEnum = z.enum(NEEDS);
export const emotionEnum = z.enum(ALL_EMOTIONS);
export const stylePresetEnum = z.enum(ILLUSTRATION_STYLE_PRESETS);
export const aspectRatioEnum = z.enum(ASPECT_RATIOS);
export const ttsVoiceEnum = z.enum(TTS_VOICES);

// ============================================================
// Sub-shapes
// ============================================================

export const bulletsSchema = z.object({
  items: z
    .array(z.string().trim().min(1, "Bullet cannot be empty"))
    .min(1, "Add at least one bullet"),
});

export const needsArraySchema = z.array(needEnum);

export const contextFactorsSchema = z
  .object({
    sleepQuality: z.number().min(0).max(10).optional(),
    physicalState: z.array(z.string().trim().min(1)).optional(),
    socialLoad: z.number().min(0).max(10).optional(),
    workLoad: z.number().min(0).max(10).optional(),
    environment: z.array(z.string().trim().min(1)).optional(),
    substances: z.array(z.string().trim().min(1)).optional(),
    note: z.string().trim().optional(),
  })
  .partial();
export type ContextFactors = z.infer<typeof contextFactorsSchema>;

export const linkedMetadataSchema = z.object({
  projectIds: z.array(z.string().uuid()).default([]),
  taskIds: z.array(z.string().uuid()).default([]),
});
export type LinkedMetadata = z.infer<typeof linkedMetadataSchema>;

// Topic extras: shape is dynamic per topic. Refined in the cross-field check below.
const topicExtrasSchema = z.record(
  z.string(),
  z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
    z.null(),
    z.undefined(),
  ]),
);
export type TopicExtras = z.infer<typeof topicExtrasSchema>;

export const aiOutputSchema = z.object({
  journalEntry: z.string(),
  emotionalRead: z.array(z.string()),
  suggestions: z.object({
    coping: z.string(),
    practical: z.string(),
    reframeQuestion: z.string(),
  }),
  earnedAppreciation: z.string(),
});
export type AIOutput = z.infer<typeof aiOutputSchema>;

export const aiMediaImageSchema = z.object({
  url: z.string().url(),
  stylePreset: stylePresetEnum,
  aspectRatio: aspectRatioEnum,
  createdAt: z.string(),
});
export const aiMediaAudioSchema = z.object({
  url: z.string().url(),
  transcript: z.string(),
  voice: ttsVoiceEnum,
  speed: z.number().min(0.25).max(4),
  createdAt: z.string(),
});
export const aiMediaSchema = z.object({
  image: aiMediaImageSchema.optional(),
  audio: aiMediaAudioSchema.optional(),
});
export type AIMedia = z.infer<typeof aiMediaSchema>;

// ============================================================
// Main entry schema (client + API)
// ============================================================

const baseEntrySchema = z.object({
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  topic: topicEnum,
  quadrant: quadrantEnum,
  primaryEmotion: emotionEnum,
  secondaryEmotion: emotionEnum.nullable().optional(),
  intensity: z.number().int().min(1).max(10),
  target: targetEnum.nullable().optional(),
  bullets: bulletsSchema,
  selfStory: z.string().trim().nullable().optional(),
  needs: needsArraySchema,
  nextTinyStep: z
    .string()
    .trim()
    .min(1, "Required")
    .max(140, "Must be 140 characters or less"),
  appreciation: z.string().trim().nullable().optional(),
  topicExtras: topicExtrasSchema.nullable().optional(),
  contextFactors: contextFactorsSchema.nullable().optional(),
  metadata: linkedMetadataSchema.nullable().optional(),
});

/**
 * Cross-field rules:
 *   - primaryEmotion belongs to the chosen quadrant.
 *   - secondaryEmotion ≠ primaryEmotion (if provided).
 *   - selfStory is non-empty when the topic requires it.
 *   - needs cardinality matches the topic config (Quick Reset = 1; others 1–2).
 */
export const journalEntryInputSchema = baseEntrySchema.superRefine((data, ctx) => {
  const quadrantEmotions = EMOTION_LISTS[data.quadrant as Quadrant];
  if (!(quadrantEmotions as readonly string[]).includes(data.primaryEmotion)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["primaryEmotion"],
      message: `Primary emotion must belong to the ${data.quadrant} quadrant`,
    });
  }

  if (
    data.secondaryEmotion &&
    data.secondaryEmotion === data.primaryEmotion
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["secondaryEmotion"],
      message: "Secondary emotion must differ from primary",
    });
  }

  const cfg = TOPIC_CONFIG[data.topic as Topic];

  if (cfg.selfStoryRequired) {
    const s = (data.selfStory ?? "").trim();
    if (!s) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selfStory"],
        message: "Self story is required for this topic",
      });
    }
  }

  if (cfg.needsCardinality === "exactly-one" && data.needs.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["needs"],
      message: "Choose exactly 1 need",
    });
  } else if (
    cfg.needsCardinality === "one-to-two" &&
    (data.needs.length < 1 || data.needs.length > 2)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["needs"],
      message: "Choose 1 or 2 needs",
    });
  }
});

export type JournalEntryInput = z.infer<typeof journalEntryInputSchema>;

// ============================================================
// AI route payload schemas
// ============================================================

export const summaryRequestSchema = baseEntrySchema.extend({
  pastEntriesContext: z
    .array(
      z.object({
        entryDate: z.string(),
        topic: topicEnum,
        primaryEmotion: emotionEnum,
        intensity: z.number().int().min(1).max(10),
      }),
    )
    .max(10)
    .optional(),
});
export type SummaryRequest = z.infer<typeof summaryRequestSchema>;

export const illustrationRequestSchema = z.object({
  entryId: z.string().uuid().optional(),
  quadrant: quadrantEnum,
  primaryEmotion: emotionEnum,
  intensity: z.number().int().min(1).max(10),
  bullets: z.array(z.string().min(1)).min(1),
  needs: needsArraySchema.min(1),
  aiSummary: z.string().optional(),
  stylePreset: stylePresetEnum.default("Symbolic cinematic illustration"),
  aspectRatio: aspectRatioEnum.default("1:1"),
  literalVsSymbolic: z.number().int().min(0).max(100).default(70),
});
export type IllustrationRequest = z.infer<typeof illustrationRequestSchema>;

export const audioRequestSchema = z.object({
  entryId: z.string().uuid().optional(),
  topic: topicEnum,
  quadrant: quadrantEnum,
  primaryEmotion: emotionEnum,
  secondaryEmotion: emotionEnum.optional(),
  intensity: z.number().int().min(1).max(10),
  bullets: z.array(z.string().min(1)).min(1),
  selfStory: z.string().optional(),
  needs: needsArraySchema.min(1),
  nextTinyStep: z.string().min(1).max(140),
  aiSummary: z.string().optional(),
  voice: ttsVoiceEnum.default("Kore"),
  speed: z.number().min(0.5).max(2).default(1),
});
export type AudioRequest = z.infer<typeof audioRequestSchema>;
