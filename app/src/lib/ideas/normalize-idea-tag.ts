/**
 * Idea tag normalization.
 *
 * Fixes the "whole sentence becomes a tag" bug: AI / fallback tags must be
 * short semantic keywords, never clauses copied out of the content.
 *
 * Rules (see Idea Capture spec):
 *  - CJK tags: preferred 2–6 Han chars, hard max 8 (proper nouns excepted).
 *  - Latin tags: preferred 1–3 words, hard max 24 chars.
 *  - No sentence punctuation, no hashtags, no vague filler, no duplicates.
 *  - The dominant script/casing of the tag is preserved (Traditional Chinese
 *    input keeps Traditional Chinese; "ChatGPT" / "New York" keep casing).
 */

/** Hard cap on Han characters before a CJK tag is treated as a sentence. */
export const MAX_CJK_TAG_CHARS = 8;
/** Hard cap on characters for a Latin/Western tag. */
export const MAX_LATIN_TAG_CHARS = 24;
/** Hard cap on whitespace-separated words for a Latin/Western tag. */
export const MAX_LATIN_TAG_WORDS = 3;

/** Vague tags that carry no signal — dropped unless embedded in a longer noun. */
const BAD_TAG_WORDS = new Set([
  "random",
  "misc",
  "miscellaneous",
  "general",
  "stuff",
  "thing",
  "things",
  "note",
  "notes",
  "idea",
  "ideas",
  "todo",
  "to-do",
  "task",
  "tasks",
  "captured",
  "capture",
  "text",
  "content",
  "untitled",
  "other",
  "others",
  "etc",
  "na",
  "n/a",
]);

/** Punctuation that signals a clause / full sentence rather than a keyword. */
const SENTENCE_PUNCT =
  /[。．｡、，,；;：:！!？?…⋯～~「」『』（）()【】[\]{}<>《》"'“”‘’｜|/\\]/u;

/**
 * Pronouns and Cantonese/colloquial particles + verbs that essentially never
 * appear inside a noun keyword. Their presence in a CJK tag means the model
 * copied spoken text — e.g. "帶阿爸阿媽去賞櫻" — so the tag is rejected even
 * when it is under the character limit.
 */
const CJK_SENTENCE_MARKERS = /[我你佢哋嘅咗喺啦喇呀嘛呢嗎吓阿諗帶睇嗮]/u;

const HAN = /\p{Script=Han}/u;
const HAN_GLOBAL = /\p{Script=Han}/gu;
const LATIN_LETTER_GLOBAL = /[A-Za-z]/g;

function countHan(text: string): number {
  return text.match(HAN_GLOBAL)?.length ?? 0;
}

function countLatinLetters(text: string): number {
  return text.match(LATIN_LETTER_GLOBAL)?.length ?? 0;
}

/** A tag is treated as CJK when it contains any Han character. */
function isCjkTag(text: string): boolean {
  return HAN.test(text);
}

/** Strip HTML entities, hashes, QUESTION/ANS prefixes, and collapse whitespace. */
function cleanTagText(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#\d+;/gi, " ")
    .replace(/^\s*(?:question|ans|answer)\s*[:：]\s*/i, "")
    .replace(/^[#＃\s]+/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * True when a (pre-cleaned) tag is unusable: empty, vague filler, contains
 * sentence punctuation, or is longer than a keyword should ever be.
 */
export function isBadIdeaTag(tag: string): boolean {
  const cleaned = cleanTagText(tag);
  if (!cleaned) return true;
  if (SENTENCE_PUNCT.test(cleaned)) return true;
  if (BAD_TAG_WORDS.has(cleaned.toLowerCase())) return true;

  if (isCjkTag(cleaned)) {
    if (CJK_SENTENCE_MARKERS.test(cleaned)) return true;
    const han = countHan(cleaned);
    // Mixed proper nouns (Han + Latin/digits, e.g. "AI技術") get a little slack.
    const hasOtherScript = countLatinLetters(cleaned) > 0 || /\d/.test(cleaned);
    const limit = hasOtherScript ? MAX_CJK_TAG_CHARS + 2 : MAX_CJK_TAG_CHARS;
    if (han > limit) return true;
    return false;
  }

  // Latin / Western tag.
  if (cleaned.length > MAX_LATIN_TAG_CHARS) return true;
  const words = cleaned.split(/[\s-]+/u).filter(Boolean);
  if (words.length > MAX_LATIN_TAG_WORDS) return true;
  return false;
}

/**
 * Clean + length-clamp a single tag. Returns `null` when the tag is too long
 * to be a keyword — we drop bad data rather than visually truncating it.
 */
export function clampIdeaTag(tag: string): string | null {
  const cleaned = cleanTagText(tag);
  if (!cleaned) return null;
  if (isBadIdeaTag(cleaned)) return null;
  return cleaned;
}

/** Full pipeline for one tag: clean → validate → clamp. */
export function normalizeIdeaTag(tag: string): string | null {
  if (typeof tag !== "string") return null;
  return clampIdeaTag(tag);
}

/** Case-insensitive dedupe (for Latin) preserving first occurrence. */
export function dedupeIdeaTags(tags: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/**
 * Normalize a raw list of AI/fallback tags into clean, deduped keywords.
 * Drops sentences, filler, and over-long fragments; caps the count.
 */
export function normalizeIdeaTags(tags: unknown, max = 8): string[] {
  if (!Array.isArray(tags)) return [];
  const normalized: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== "string") continue;
    const clean = normalizeIdeaTag(tag);
    if (clean) normalized.push(clean);
  }
  return dedupeIdeaTags(normalized).slice(0, max);
}
