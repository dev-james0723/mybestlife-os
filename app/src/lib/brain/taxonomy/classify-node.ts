/**
 * Classify a partially-constructed BrainNode.
 *
 * Adapters in `lib/brain/adapters/*.ts` produce a draft `BrainNode` from
 * raw module rows. Before the relationship engine sees them, we run them
 * through `classifyBrainNode` to fill in:
 *
 *   - `canonicalTags`: topic cluster slugs
 *   - `categories`: the topic-cluster *categories* (currently just life
 *     areas, kept under the same key so the canvas can render them)
 *   - `lifeAreas`: resolved life-area slugs
 *
 * Adapters never call the matchers directly; they hand a draft to this
 * helper. That keeps the alias rules in one place.
 */

import type { BrainNode } from "@/types/brain-graph";
import {
  matchTopics,
  resolveLifeAreas,
  type LifeAreaSlug,
  type TopicSlug,
} from "./normalizers";
import { isGenericTopic } from "./topics";

export type ClassifyOptions = {
  /** Source module string used to seed life-area hints. */
  sourceModule?: string;
  /** Cap on life areas per node. Default 3. */
  lifeAreaCap?: number;
  /** Drop generic topic slugs from canonicalTags. Default true. */
  dropGenericTopics?: boolean;
};

/**
 * Augment a draft BrainNode with normalized canonical tags, categories,
 * and life areas. Does NOT mutate the input — returns a new object.
 */
export function classifyBrainNode(
  draft: BrainNode,
  options: ClassifyOptions = {},
): BrainNode {
  const { sourceModule, lifeAreaCap = 3, dropGenericTopics = true } = options;

  // ── Canonical topic slugs ───────────────────────────────────────────
  const rawTags: string[] = draft.tags ?? [];
  const topicSlugs: Set<TopicSlug> = matchTopics(rawTags, {
    dropGeneric: dropGenericTopics,
  });

  // Also try the title — short, high signal.
  if (draft.title) {
    for (const s of matchTopics([draft.title], {
      dropGeneric: dropGenericTopics,
    })) {
      topicSlugs.add(s);
    }
  }

  // ── Life areas ──────────────────────────────────────────────────────
  const lifeAreas: LifeAreaSlug[] = resolveLifeAreas({
    explicit: draft.lifeAreas as LifeAreaSlug[] | undefined,
    sourceModule,
    topics: topicSlugs,
    rawTags,
    rawCategory: draft.categories?.[0],
    rawText: [draft.title, draft.summary, draft.bodyText]
      .filter(Boolean)
      .join(" "),
    cap: lifeAreaCap,
  });

  // ── Categories: union(topic categories, lifeAreas) ─────────────────
  // For now we treat life areas *as* the high-level categories (topics
  // could be promoted to categories in a future iteration).
  const categories = new Set<string>();
  for (const a of lifeAreas) categories.add(a);
  for (const c of draft.categories ?? []) categories.add(c);

  // Final canonicalTags: keep topic slugs and (where useful) the original
  // raw tags so legacy text search still works. We never include generic
  // tags in canonicalTags.
  const canonicalTags = new Set<string>(draft.canonicalTags ?? []);
  for (const t of topicSlugs) canonicalTags.add(t);
  for (const raw of rawTags) {
    if (!raw) continue;
    if (isGenericTopic(raw)) continue;
    // Don't double-store raw forms when a canonical exists.
    canonicalTags.add(raw.toLowerCase().trim());
  }

  return {
    ...draft,
    canonicalTags: [...canonicalTags],
    categories: [...categories],
    lifeAreas,
  };
}
