/**
 * Match raw incoming tag strings to canonical tags.
 *
 * Strategy:
 *   1. Build a *normalization index* once per taxonomy (alias key → canonical id).
 *      Includes the canonical name, slug, and every alias. All entries pass
 *      through `normalizeTagName`, so cosmetic variants of the alias work too.
 *   2. Lookup is O(1) when a normalized key matches anything in the index
 *      (alias, slug, or canonical name).
 *   3. Fallback is a small fuzzy search over the index keys with a
 *      similarity floor (~0.86). Keeps `ai agnt` → `ai agents` rare cases
 *      working without producing false positives like `git` → `gpt`.
 */

import { CANONICAL_TAGS } from "./seed-taxonomy";
import { normalizeTagName, similarityRatio, slugifyTagName } from "./normalize";
import type { CanonicalTagDef, TagMatchResult } from "./types";

type IndexEntry = {
  normalized: string;
  canonicalId: string;
  /** What kind of mapping produced this entry — used as the match `reason`. */
  reason: "alias" | "slug" | "name";
};

/** Build the alias / slug / name index for a given taxonomy seed. */
export function buildMatchIndex(canonicals: readonly CanonicalTagDef[] = CANONICAL_TAGS) {
  const byKey = new Map<string, IndexEntry>();

  const insert = (entry: IndexEntry) => {
    if (!entry.normalized) return;
    const existing = byKey.get(entry.normalized);
    if (!existing) {
      byKey.set(entry.normalized, entry);
      return;
    }
    // Prefer name > slug > alias when there's a collision (deterministic).
    const order: Record<IndexEntry["reason"], number> = { name: 3, slug: 2, alias: 1 };
    if (order[entry.reason] > order[existing.reason]) byKey.set(entry.normalized, entry);
  };

  for (const def of canonicals) {
    insert({ normalized: normalizeTagName(def.name), canonicalId: def.id, reason: "name" });
    insert({ normalized: normalizeTagName(def.slug), canonicalId: def.id, reason: "slug" });
    insert({ normalized: normalizeTagName(def.id), canonicalId: def.id, reason: "slug" });
    for (const alias of def.aliases) {
      insert({ normalized: normalizeTagName(alias), canonicalId: def.id, reason: "alias" });
    }
  }

  return byKey;
}

/**
 * Try to map a raw tag onto a canonical id.
 *
 * Returns `null` when no confident match is found — the caller can either
 * fall back to a synthetic `Other` bucket or, if it has authority to extend
 * the taxonomy (e.g. an admin tool), promote the raw string into a brand
 * new canonical tag.
 *
 * `fuzzyThreshold` defaults conservatively: only matches at >= 0.86
 * similarity are accepted, and only when the candidate is at least 4 chars
 * long. This prevents single-character collisions like "git" ↔ "gpt".
 */
export function findMatchingCanonicalTag(
  rawTag: string,
  options: {
    index?: Map<string, IndexEntry>;
    fuzzyThreshold?: number;
  } = {},
): TagMatchResult | null {
  const key = normalizeTagName(rawTag);
  if (!key) return null;
  const index = options.index ?? buildMatchIndex();
  const direct = index.get(key);
  if (direct) {
    return { canonicalId: direct.canonicalId, reason: direct.reason, confidence: 1 };
  }

  // Try slugified form too (e.g. raw `AI / Agents`).
  const slug = slugifyTagName(rawTag);
  if (slug && slug !== key) {
    const viaSlug = index.get(slug.replace(/-/g, " "));
    if (viaSlug) {
      return { canonicalId: viaSlug.canonicalId, reason: viaSlug.reason, confidence: 1 };
    }
  }

  if (key.length < 4) return null;

  const fuzzyThreshold = options.fuzzyThreshold ?? 0.86;
  let best: { id: string; score: number } | null = null;
  for (const [indexKey, entry] of index) {
    if (indexKey.length < 4) continue;
    // Skip obviously-different lengths to keep this O(N) cheap.
    if (Math.abs(indexKey.length - key.length) > 4) continue;
    const score = similarityRatio(indexKey, key);
    if (score >= fuzzyThreshold && (!best || score > best.score)) {
      best = { id: entry.canonicalId, score };
    }
  }

  return best ? { canonicalId: best.id, reason: "fuzzy", confidence: best.score } : null;
}
