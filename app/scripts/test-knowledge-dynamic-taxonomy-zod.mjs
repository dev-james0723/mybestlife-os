/**
 * Pure Zod check for knowledge dynamic taxonomy schema (no network).
 * Run: node scripts/test-knowledge-dynamic-taxonomy-zod.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { z } = require("zod");

const DynamicTaxonomyNewTagZ = z.object({
  name: z.string().min(1).max(80),
  slugHint: z.string().max(80),
});

const DynamicTaxonomyResponseZ = z.object({
  primaryCategoryId: z.string(),
  primaryCategoryNameIfNew: z.string().max(80),
  tagIds: z.array(z.string()).max(8),
  newTags: z.array(DynamicTaxonomyNewTagZ).max(3),
  newCategoryName: z.string().max(80),
  newCategorySlugHint: z.string().max(80),
  newCategoryDescription: z.string().max(240),
  rationaleBrief: z.string().max(400),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
});

const sample = {
  primaryCategoryId: "",
  primaryCategoryNameIfNew: "Cooking",
  tagIds: [],
  newTags: [{ name: "Sourdough", slugHint: "sourdough" }],
  newCategoryName: "Cooking",
  newCategorySlugHint: "cooking",
  newCategoryDescription: "Food and recipes",
  rationaleBrief: "Content is about baking.",
  confidence: 0.82,
  needsReview: false,
};

const r = DynamicTaxonomyResponseZ.safeParse(sample);
if (!r.success) {
  console.error(r.error.flatten());
  process.exit(1);
}
console.log("ok", r.data.newTags.length);
