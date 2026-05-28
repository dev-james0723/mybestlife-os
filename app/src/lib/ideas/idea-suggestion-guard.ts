/**
 * Similarity guard for AI suggestions.
 *
 * The "AI Suggestions" panel must add value, not echo the idea content back.
 * These helpers detect when a generated insight overlaps the original content
 * too much so the caller can drop or hide it.
 */

import { stripHtml } from "@/lib/utils/html";

function normalize(text: string): string {
  return stripHtml(text).toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenSet(text: string): Set<string> {
  const set = new Set<string>();
  const normalized = text.toLowerCase();
  for (const m of normalized.matchAll(/[\p{Letter}\p{Number}]{2,}/gu)) set.add(m[0]);
  for (const m of normalized.matchAll(/\p{Script=Han}/gu)) set.add(m[0]);
  return set;
}

/** Containment ratio: |A ∩ B| / |smaller set|, in [0, 1]. */
export function textOverlapRatio(a: string, b: string): number {
  const sa = tokenSet(normalize(a));
  const sb = tokenSet(normalize(b));
  if (sa.size === 0 || sb.size === 0) return 0;
  const [small, large] = sa.size <= sb.size ? [sa, sb] : [sb, sa];
  let inter = 0;
  for (const t of small) if (large.has(t)) inter += 1;
  return inter / small.size;
}

/**
 * True when `suggestion` substantially repeats `content` and should not be
 * shown as an "insight". Verbatim substrings and high token containment both
 * count as duplication.
 */
export function isSuggestionTooSimilar(
  suggestion: string,
  content: string,
  threshold = 0.8,
): boolean {
  const s = normalize(suggestion);
  const c = normalize(content);
  if (!s) return true;
  if (s.length > 12 && c.includes(s)) return true;
  return textOverlapRatio(s, c) >= threshold;
}
