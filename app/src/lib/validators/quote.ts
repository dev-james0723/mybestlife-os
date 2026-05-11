/**
 * Zod validators for the Quote Library.
 *
 * Used at every untrusted boundary: AI-structured output, API route bodies,
 * and optionally before Supabase writes when data came from outside the app
 * (imports, share-sheet OCR, etc.).
 */

import { z } from "zod";
import {
  QUOTE_CATEGORY_VALUES,
  QUOTE_EMOTION_TONES,
  QUOTE_SOURCE_MODULES,
  QUOTE_SOURCE_TYPES,
} from "@/types/quote";

export const QuoteCategorySchema = z.enum(QUOTE_CATEGORY_VALUES);
export const QuoteEmotionToneSchema = z.enum(QUOTE_EMOTION_TONES);
export const QuoteSourceTypeSchema = z.enum(QUOTE_SOURCE_TYPES);
export const QuoteSourceModuleSchema = z.enum(QUOTE_SOURCE_MODULES);

/** Free-form tag — stored in the `tags TEXT[]` column. */
export const QuoteTagSchema = z
  .string()
  .trim()
  .min(1, "tag_required")
  .max(40, "tag_too_long");

/** Shape accepted by the Add Quote flow and the repository `create` function. */
export const CreateQuoteSchema = z.object({
  quote_text: z
    .string()
    .trim()
    .min(1, "quote_required")
    .max(4000, "quote_too_long"),
  source_author: z
    .string()
    .trim()
    .max(200, "author_too_long")
    .nullable()
    .optional(),
  source_context: z
    .string()
    .trim()
    .max(400, "context_too_long")
    .nullable()
    .optional(),
  source_url: z
    .string()
    .trim()
    .url("invalid_url")
    .max(2000)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  source_type: QuoteSourceTypeSchema.nullable().optional(),
  source_module: QuoteSourceModuleSchema.nullable().optional(),
  category: QuoteCategorySchema.nullable().optional(),
  tags: z.array(QuoteTagSchema).max(20).optional(),
  emotion_tone: QuoteEmotionToneSchema.nullable().optional(),
  personal_note: z.string().trim().max(4000).nullable().optional(),
  is_favorite: z.boolean().optional(),
  linked_goal_id: z.string().uuid().nullable().optional(),
  language: z.string().min(2).max(10).optional(),
});

export type CreateQuoteValidated = z.infer<typeof CreateQuoteSchema>;

export const UpdateQuoteSchema = CreateQuoteSchema.partial();

/**
 * Shape returned by the Smart Tagging prompt — matches the Gemini
 * `responseSchema` used in Phase 3. Kept here so both the API route and any
 * consumer can validate the same payload.
 */
export const SmartTaggingResponseSchema = z.object({
  category: QuoteCategorySchema,
  tags: z.array(QuoteTagSchema).min(3).max(6),
  emotion_tone: QuoteEmotionToneSchema,
  confidence: z.number().min(0).max(1),
  detected_language: z.string().min(2).max(10).optional(),
});

export type SmartTaggingResponse = z.infer<typeof SmartTaggingResponseSchema>;

/** Source Intelligence enrichment response. */
export const SourceIntelligenceResponseSchema = z.object({
  author_bio: z.string().min(1).max(1200).nullable(),
  historical_context: z.string().min(1).max(1200).nullable(),
  related_quotes: z
    .array(
      z.object({
        text: z.string().min(1).max(600),
        source: z.string().max(300).nullable().optional(),
      }),
    )
    .max(5),
  confidence: z.number().min(0).max(1),
  unverified: z.boolean(),
});

export type SourceIntelligenceResponse = z.infer<
  typeof SourceIntelligenceResponseSchema
>;

/** Collection create/update schema. */
export const CreateCollectionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).nullable().optional(),
  color: z.string().trim().max(40).nullable().optional(),
  icon: z.string().trim().max(40).nullable().optional(),
});

export type CreateCollectionValidated = z.infer<typeof CreateCollectionSchema>;
