import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { CANONICAL_TAGS } from "@/lib/knowledge/tags/seed-taxonomy";
import { findMatchingCanonicalTag, buildMatchIndex } from "@/lib/knowledge/tags/match";
import { normalizeTagName } from "@/lib/knowledge/tags/normalize";

const MAX_TAG_INVENTORY = 60;

/**
 * AI-suggest tags for a knowledge item.
 *
 * Behavior:
 *   1. The model is shown a curated inventory of existing canonical tag
 *      names from the taxonomy plus any user-specific tags already in the
 *      knowledge base. The prompt explicitly tells the model to *reuse*
 *      those whenever they fit, and only invent new ones when no existing
 *      tag is a reasonable fit.
 *   2. After the model responds, every suggested tag is run through the
 *      canonical matcher. Anything that matches an existing canonical tag
 *      is replaced with that canonical name (no more `ai-agent` /
 *      `ai-agents` duplicates). Tags that don't match are kept as-is so
 *      the user can later promote them via admin tooling.
 *   3. Output is deduped by normalized form, so casing variants returned
 *      by the model collapse into one tag.
 *
 * Returns the final list of tags as plain strings — the caller (mutations
 * pipeline) writes them straight to `ai_tags`. The on-read taxonomy layer
 * then folds them onto canonical ids when rendering the sidebar.
 */
export async function suggestTags(
  rawText: string,
  title: string,
  options: {
    /**
     * The user's existing tag inventory. Pass the union of every tag that
     * already lives in the knowledge base so the AI can prefer them. The
     * function will trim to the most useful subset itself.
     */
    knownTags?: string[];
  } = {},
): Promise<string[]> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  if (!rawText.trim()) {
    throw new Error("No content for tag suggestion");
  }

  const inventory = buildInventory(options.knownTags ?? []);
  const inventoryHint =
    inventory.length > 0
      ? `\nExisting canonical tags in the user's knowledge base. Reuse one of these whenever it fits the content; only invent a new tag when none is a good match:\n- ${inventory.join("\n- ")}`
      : "";

  const { text } = await fetchGeminiPlannerJsonText({
    apiKey,
    systemInstruction: `You are a knowledge-base tagger that maintains a clean, deduplicated taxonomy.
Rules:
1. Suggest 3-7 short topic tags for the given content.
2. STRONGLY PREFER reusing tags from the provided inventory when any of them fit. Reuse means returning the EXACT canonical name.
3. Only invent a brand new tag when no existing tag is semantically close.
4. Use Title Case multi-word tags ("AI Agents", "Prompt Engineering"). Avoid hyphens unless the tag is conventionally hyphenated.
5. Never produce two tags that mean the same thing in the same response.
6. Match the language of the source for tags if it's not English (e.g. Chinese content can have Chinese tags), but still prefer reusing inventory tags first.
Respond ONLY with a JSON object: { "tags": ["Tag One", "Tag Two", ...] }`,
    userText: `Title: ${title}${inventoryHint}\n\nContent:\n${rawText.slice(0, 3000)}`,
  });

  const parsed = JSON.parse(text) as { tags?: string[] };
  const raw = parsed.tags ?? [];
  return canonicalizeAndDedupe(raw);
}

/**
 * Build the canonical-tag inventory shown to the AI. We send the union of:
 *   - the curated seed taxonomy canonical names (so the model knows our
 *     preferred labels even on a brand new database), and
 *   - the user's actually-used tags (so the model can preserve any
 *     user-introduced tags that aren't in the seed yet).
 *
 * Truncated to a reasonable size to keep the prompt cheap.
 */
function buildInventory(userTags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const def of CANONICAL_TAGS) {
    const key = normalizeTagName(def.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(def.name);
  }

  for (const tag of userTags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const key = normalizeTagName(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= MAX_TAG_INVENTORY) break;
  }

  return out.slice(0, MAX_TAG_INVENTORY);
}

/**
 * Post-process model output: canonicalize where possible, dedupe, drop empties.
 */
function canonicalizeAndDedupe(rawTags: string[]): string[] {
  const index = buildMatchIndex();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of rawTags) {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) continue;
    const match = findMatchingCanonicalTag(trimmed, { index });
    let final = trimmed;
    if (match) {
      const canonical = CANONICAL_TAGS.find((c) => c.id === match.canonicalId);
      if (canonical) final = canonical.name;
    }
    const key = normalizeTagName(final);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(final);
  }
  return out;
}
