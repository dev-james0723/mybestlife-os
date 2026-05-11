/**
 * Gemini structured output for per-user knowledge taxonomy (categories + tags).
 * Schema dialect: OpenAPI-3 subset required by {@link fetchGeminiStructured}.
 */

import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const DynamicTaxonomyNewTagZ = z.object({
  name: z.string().min(1).max(80),
  slugHint: z.string().max(80),
});

export const DynamicTaxonomyResponseZ = z.object({
  /** Existing category UUID, or empty string when proposing a new category. */
  primaryCategoryId: z.string(),
  /** When creating a new category, short display name (may duplicate newCategoryName). */
  primaryCategoryNameIfNew: z.string().max(80),
  /** Existing tag UUIDs only — must appear in the payload sent to the model. */
  tagIds: z.array(z.string()).max(8),
  newTags: z.array(DynamicTaxonomyNewTagZ).max(3),
  /** When reusing a category, leave all three empty. */
  newCategoryName: z.string().max(80),
  newCategorySlugHint: z.string().max(80),
  newCategoryDescription: z.string().max(240),
  rationaleBrief: z.string().max(400),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
});

export type DynamicTaxonomyResponse = z.infer<typeof DynamicTaxonomyResponseZ>;

export const KnowledgeDynamicTaxonomyGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: [
    "primaryCategoryId",
    "primaryCategoryNameIfNew",
    "tagIds",
    "newTags",
    "newCategoryName",
    "newCategorySlugHint",
    "newCategoryDescription",
    "rationaleBrief",
    "confidence",
    "needsReview",
  ],
  properties: {
    primaryCategoryId: { type: "string" },
    primaryCategoryNameIfNew: { type: "string" },
    tagIds: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    newTags: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        required: ["name", "slugHint"],
        properties: {
          name: { type: "string" },
          slugHint: { type: "string" },
        },
      },
    },
    newCategoryName: { type: "string" },
    newCategorySlugHint: { type: "string" },
    newCategoryDescription: { type: "string" },
    rationaleBrief: { type: "string" },
    confidence: { type: "number" },
    needsReview: { type: "boolean" },
  },
};

export const KNOWLEDGE_DYNAMIC_TAXONOMY_SYSTEM_PROMPT = `You are a taxonomy assistant for a personal knowledge base. Each user has their own categories and tags stored in a database. Your job is to classify ONE new knowledge item.

Rules:
1) REUSE FIRST: Prefer mapping the item to existing category IDs and tag IDs from the provided lists. Only propose new categories or tags when nothing existing is a reasonable fit.
2) NEW LABELS: New category/tag names must be short (2–6 words), specific, and not duplicates of existing names (case/spacing insensitive). Avoid generic names like "General", "Misc", "Other" unless the taxonomy already uses them.
3) HIERARCHY: Categories are top-level buckets. Tags are finer labels; assign a primary category (existing ID, or propose newCategory* fields).
4) MULTILINGUAL: The knowledge text may be Chinese (Cantonese/Mandarin), English, or mixed. Labels may match the dominant language of the title/body; slug hints should be lowercase ASCII with hyphens (transliterate or use short English equivalents when needed).
5) LIMITS: Propose at most one new category per response unless clearly impossible with one. At most 8 reused tag IDs total. At most 3 new tags.
6) CONFIDENCE: confidence in 0..1. If confidence < 0.55, set needsReview to true and prefer existing labels over inventing new ones.
7) OUTPUT: Fill every field in the JSON schema. Use empty string "" for unused optional strings (e.g. primaryCategoryId when creating a category, or newCategoryName when reusing).
8) PRIVACY: Do not echo secrets, API keys, or tokens.

Always ensure at least one tag applies: reuse tag IDs and/or add newTags. If only a category fits, add one newTags entry summarizing the topic.`;
