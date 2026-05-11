/**
 * String normalization for tag comparison.
 *
 * The goal of `normalizeTagName` is to fold every spelling that *humans
 * (or LLMs) would consider the same tag* onto a single canonical key. The
 * canonical alias dictionary ({@link CanonicalTagDef.aliases}) only needs
 * to list semantic synonyms — the normalizer handles cosmetic variants.
 *
 * Rules applied (in order):
 *   1. Trim, casefold to lowercase
 *   2. NFKC unicode normalization (full-width punctuation → ASCII)
 *   3. Strip common punctuation, collapse whitespace
 *   4. Collapse separators: `_`, `/`, `\`, `·`, `•` → space
 *   5. Collapse `-` and ` ` runs to a single space (so "ai-agents" === "ai agents")
 *   6. Singular/plural fold (English: `agents` → `agent`, `studies` → `study`)
 *   7. Strip leading/trailing whitespace again
 *
 * `slugifyTagName` returns the kebab-case URL form derived from the
 * normalized string ("AI Agents" → "ai-agents"), so it can be used as a
 * dictionary key and a stable id without further processing.
 */

const PUNCT_TO_SPACE = /[.,;:!?"'`(){}\[\]<>|]/g;
const SEPARATOR_TO_SPACE = /[_\/\\·•、，。]/g;
const HYPHEN_OR_WHITESPACE = /[-\s]+/g;
const NON_SLUG_CHARS = /[^a-z0-9\u00c0-\u024f\u0370-\u03ff\u0400-\u04ff\u4e00-\u9fff\s-]/g;

/** Casefolded canonical key used for alias-table lookups. */
export function normalizeTagName(input: string): string {
  if (!input) return "";
  let out = input.normalize("NFKC").trim().toLowerCase();
  out = out.replace(PUNCT_TO_SPACE, " ");
  out = out.replace(SEPARATOR_TO_SPACE, " ");
  out = out.replace(HYPHEN_OR_WHITESPACE, " ").trim();
  out = depluralize(out);
  return out;
}

/** Slug form: lowercase, hyphenated, ASCII/CJK-friendly, no leading/trailing hyphens. */
export function slugifyTagName(input: string): string {
  const normalized = normalizeTagName(input);
  if (!normalized) return "";
  return normalized
    .replace(NON_SLUG_CHARS, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * English plural → singular fold for *each whitespace-separated word*. We do
 * this on the normalized form so "ai agents" and "ai agent" collide. CJK
 * tokens are left alone.
 *
 * Heuristic, intentionally conservative:
 *   - words ending in `ies` longer than 4 chars → `y`
 *   - words ending in `sses` / `xes` / `ches` / `shes` → drop trailing `es`
 *   - words ending in `s` longer than 3 chars (and not `ss`) → drop `s`
 *
 * "data", "css", "js" etc. are short enough to be skipped by the length
 * guards. Unknown irregulars fall back gracefully because aliases catch them.
 */
function depluralize(text: string): string {
  return text
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      // Skip very short words or all-CJK words.
      if (word.length <= 3) return word;
      if (/^[\u4e00-\u9fff]+$/.test(word)) return word;
      if (/ies$/.test(word) && word.length > 4) return word.slice(0, -3) + "y";
      if (/(sses|xes|ches|shes)$/.test(word)) return word.slice(0, -2);
      if (/[^s]s$/.test(word) && word.length > 3) return word.slice(0, -1);
      return word;
    })
    .join(" ");
}

/**
 * Levenshtein distance with early-exit threshold. Used as a last-resort
 * fuzzy match when neither alias nor slug nor exact-name matched.
 */
export function damerauLevenshtein(a: string, b: string, threshold = 3): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > threshold) return threshold + 1;

  // Two-row DP (edits within window).
  const prev: number[] = new Array(n + 1);
  const curr: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        curr[j] = Math.min(curr[j], prev[j - 2] !== undefined ? prev[j - 2] + 1 : curr[j]);
      }
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > threshold) return threshold + 1;
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/**
 * Compute a similarity ratio in [0, 1] from edit distance.
 * 1 = identical, 0 = completely different.
 */
export function similarityRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const longer = Math.max(a.length, b.length);
  if (longer === 0) return 1;
  const distance = damerauLevenshtein(a, b, longer);
  return 1 - distance / longer;
}
