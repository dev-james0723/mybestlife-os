/**
 * Signals — deterministic text matching helpers.
 *
 * Pure, dependency-free, reproducible. Used by both scoring (`personalFit`) and
 * relevance-basis derivation (the honest "why this signal?"). No LLM, no
 * network — given the same inputs, always the same output.
 */

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "at",
  "by",
  "from",
  "is",
  "are",
  "be",
  "as",
  "it",
  "this",
  "that",
  "new",
  "my",
  "your",
]);

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

/** Split text into meaningful lowercase tokens (drops stopwords + very short). */
export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * True when `term` (a multi-word interest like "d festival" or a single topic
 * like "ai") is present in `text` as a whole-word/phrase match. Case- and
 * punctuation-insensitive.
 */
export function termAppearsIn(text: string, term: string): boolean {
  const haystack = ` ${normalizeText(text)} `;
  const needle = normalizeText(term);
  if (!needle) return false;
  // Multi-word phrase → substring match on normalized text.
  if (needle.includes(" ")) return haystack.includes(` ${needle} `) || haystack.includes(needle);
  // Single token → whole-word match to avoid "ai" matching "said".
  return haystack.includes(` ${needle} `);
}

/**
 * Returns the best (longest) interest term found in `text`, or null. Longer
 * matches win so "ai product strategy" is preferred over bare "ai".
 */
export function bestTermMatch(text: string, terms: string[]): string | null {
  let best: string | null = null;
  for (const term of terms) {
    if (!term) continue;
    if (termAppearsIn(text, term)) {
      if (!best || term.length > best.length) best = term;
    }
  }
  return best;
}

/**
 * Overlap score in [0,1] between a candidate text and a set of interest terms.
 * Diminishing returns so one strong match already scores well, and a flood of
 * weak matches can't dominate.
 */
export function overlapScore(text: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  const seen = new Set<string>();
  for (const term of terms) {
    if (termAppearsIn(text, term)) seen.add(normalizeText(term));
  }
  const hits = seen.size;
  if (hits === 0) return 0;
  // 1 hit → 0.6, 2 → 0.82, 3 → 0.92, saturating toward 1.
  return 1 - Math.pow(0.4, hits);
}
