/**
 * Brain taxonomy normalizers.
 *
 * Thin wrappers around the existing knowledge tag normalizer that produce
 * Brain-specific outputs: canonical topic slugs, life-area slugs, and
 * value slugs. Importantly, matchers operate on *already-normalized*
 * input — `normalizeTagName` from the knowledge module handles cosmetic
 * variants (case, hyphens, plurals, full-width punctuation, …) so this
 * module can keep its alias tables short and human-readable.
 */

import { normalizeTagName, slugifyTagName } from "@/lib/knowledge/tags/normalize";
import {
  LIFE_AREAS,
  type LifeAreaDef,
  type LifeAreaSlug,
} from "./life-areas";
import {
  TOPIC_ALIAS_INDEX,
  TOPICS,
  type TopicDef,
  type TopicSlug,
  isGenericTopic,
} from "./topics";
import { VALUE_ALIAS_INDEX, VALUES, type ValueSlug } from "./values";

/** Re-export the underlying normalizers for callers that need them. */
export { normalizeTagName, slugifyTagName };

// ============================================================
// Tag → topic matching
// ============================================================

/**
 * Map a single raw tag string onto a canonical topic slug, or undefined if
 * no canonical topic is known.
 *
 * Matching strategy:
 *   1. Normalize the tag.
 *   2. Look up the normalized form in `TOPIC_ALIAS_INDEX`.
 *   3. Fallback: try the slugified form (kebab-case).
 *   4. If no match, return undefined — caller decides whether to keep the
 *      raw string as a "smart_tag" leaf.
 */
export function matchTopic(raw: string): TopicSlug | undefined {
  if (!raw) return undefined;
  const normalized = normalizeTagName(raw);
  if (!normalized) return undefined;
  const direct = TOPIC_ALIAS_INDEX.get(normalized);
  if (direct) return direct;
  const slug = slugifyTagName(raw);
  if (!slug) return undefined;
  return TOPIC_ALIAS_INDEX.get(slug);
}

/**
 * Match a list of raw tags onto unique topic slugs.
 *
 * `dropGeneric` (default true): drops topics flagged generic in
 * `topics.ts` because their semantic content is too low to act as graph
 * hubs alone. Generic topics still appear when paired with another signal
 * (life area, entity mention, semantic similarity).
 */
export function matchTopics(
  rawTags: ReadonlyArray<string>,
  options: { dropGeneric?: boolean } = {},
): Set<TopicSlug> {
  const dropGeneric = options.dropGeneric ?? true;
  const out = new Set<TopicSlug>();
  for (const raw of rawTags) {
    if (!raw) continue;
    if (dropGeneric && isGenericTopic(normalizeTagName(raw))) continue;
    const slug = matchTopic(raw);
    if (slug) out.add(slug);
  }
  return out;
}

// ============================================================
// Tag/topic → life area
// ============================================================

const LIFE_AREA_ALIAS_INDEX: Map<string, LifeAreaSlug> = (() => {
  const idx = new Map<string, LifeAreaSlug>();
  for (const a of LIFE_AREAS) {
    idx.set(a.slug, a.slug);
    for (const alias of a.aliases) idx.set(alias.toLowerCase(), a.slug);
  }
  return idx;
})();

const TOPIC_LIFE_AREAS: Map<TopicSlug, LifeAreaSlug[]> = (() => {
  const m = new Map<TopicSlug, LifeAreaSlug[]>();
  for (const t of TOPICS) {
    if (t.lifeAreas?.length) m.set(t.slug, t.lifeAreas);
  }
  return m;
})();

/** Direct life-area match for a single normalized tag. */
export function matchLifeArea(raw: string): LifeAreaSlug | undefined {
  if (!raw) return undefined;
  const normalized = normalizeTagName(raw);
  if (!normalized) return undefined;
  return LIFE_AREA_ALIAS_INDEX.get(normalized);
}

/** Get life areas implied by a topic slug. */
export function lifeAreasFromTopic(slug: TopicSlug): LifeAreaSlug[] {
  return TOPIC_LIFE_AREAS.get(slug) ?? [];
}

/**
 * Resolve life areas for a node from a combination of:
 *   - explicit life-area slugs the caller already determined
 *   - source module hints (e.g. "habit" → personal_growth, "career" → career)
 *   - matched topic slugs
 *   - raw tags / category strings (alias lookup)
 *
 * The result is capped (default 3) so low-signal nodes don't claim every
 * life area at once.
 */
export function resolveLifeAreas(input: {
  explicit?: ReadonlyArray<LifeAreaSlug>;
  sourceModule?: string;
  topics?: Iterable<TopicSlug>;
  rawTags?: ReadonlyArray<string>;
  rawCategory?: string;
  rawText?: string;
  cap?: number;
}): LifeAreaSlug[] {
  const cap = input.cap ?? 3;
  const out = new Set<LifeAreaSlug>();

  // 1. Explicit wins.
  for (const a of input.explicit ?? []) out.add(a);

  // 2. Source module hints.
  if (input.sourceModule) {
    const mod = input.sourceModule.toLowerCase();
    for (const def of LIFE_AREAS) {
      if (def.sourceModuleHints?.includes(mod)) out.add(def.slug);
    }
  }

  // 3. Topic-implied life areas.
  if (input.topics) {
    for (const t of input.topics) {
      for (const a of lifeAreasFromTopic(t)) out.add(a);
    }
  }

  // 4. Raw tag aliases.
  for (const raw of input.rawTags ?? []) {
    const a = matchLifeArea(raw);
    if (a) out.add(a);
  }

  // 5. Raw category alias.
  if (input.rawCategory) {
    const a = matchLifeArea(input.rawCategory);
    if (a) out.add(a);
  }

  // 6. Body text — quick scan over each life area's aliases. Keep this
  //    cheap: substring scan against the lowercased text. False positives
  //    are acceptable here because life-area edges are weight-capped at
  //    ~0.55 and require additional signals.
  if (input.rawText && out.size < cap) {
    const text = input.rawText.toLowerCase();
    for (const def of LIFE_AREAS) {
      if (out.has(def.slug)) continue;
      for (const alias of def.aliases) {
        const a = alias.toLowerCase();
        if (a.length < 4) continue;
        if (text.includes(a)) {
          out.add(def.slug);
          break;
        }
      }
      if (out.size >= cap) break;
    }
  }

  return [...out].slice(0, cap);
}

// ============================================================
// Value matching
// ============================================================

/**
 * Match a piece of text (typically a quote body or a journal title) against
 * the canonical Values list. Returns every distinct value slug found.
 */
export function matchValuesInText(text: string): Set<ValueSlug> {
  const out = new Set<ValueSlug>();
  if (!text) return out;
  const lower = text.toLowerCase();
  for (const v of VALUES) {
    for (const alias of v.aliases) {
      const a = alias.toLowerCase();
      if (a.length < 4) continue;
      if (lower.includes(a)) {
        out.add(v.slug);
        break;
      }
    }
  }
  return out;
}

/** Match a single tag string to a value slug. */
export function matchValueTag(raw: string): ValueSlug | undefined {
  if (!raw) return undefined;
  const normalized = normalizeTagName(raw);
  if (!normalized) return undefined;
  return VALUE_ALIAS_INDEX.get(normalized);
}

// ============================================================
// Re-exports for callers that want a single import surface
// ============================================================

export type { LifeAreaDef, LifeAreaSlug, TopicDef, TopicSlug, ValueSlug };
export { LIFE_AREAS, TOPICS, VALUES, isGenericTopic };
