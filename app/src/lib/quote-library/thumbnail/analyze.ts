/**
 * Gemini-powered quote analysis for thumbnail generation.
 *
 * Takes a saved quote and returns a structured `VisualDirection` (mood,
 * palette, composition notes, symbolism) plus a ready-to-render image
 * prompt. Pure server-side: requires the Gemini API key.
 *
 * The output is shape-validated via the Zod schema below before it leaves
 * this module — callers can trust every field is present.
 */

import { z } from "zod";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import { ThumbnailDirectionGeminiSchema } from "@/lib/ai/schemas/quote-library/thumbnail";
import type { Quote } from "@/types/quote";
import {
  classifyFallbackFamily,
  getFallbackQuoteThumbnailConfig,
} from "@/lib/quote-library/thumbnail/fallback";

// ============================================================
// Types
// ============================================================

export type AnalyzableQuote = Pick<
  Quote,
  | "id"
  | "quote_text"
  | "source_author"
  | "source_context"
  | "tags"
  | "category"
  | "emotion_tone"
  | "thumbnail_mood"
>;

export type VisualDirection = {
  mood: string;
  tone: string;
  visual_keywords: string[];
  color_palette: string[];
  composition_notes: string;
  symbolism: string[];
  image_prompt: string;
};

export const VisualDirectionSchema = z.object({
  mood: z.string().trim().min(1).max(200),
  tone: z.string().trim().min(1).max(200),
  visual_keywords: z.array(z.string().trim().min(1).max(80)).min(3).max(10),
  color_palette: z.array(z.string().trim().min(1).max(60)).min(3).max(8),
  composition_notes: z.string().trim().min(1).max(800),
  symbolism: z.array(z.string().trim().min(1).max(80)).min(2).max(8),
  image_prompt: z.string().trim().min(40).max(1400),
});

// ============================================================
// Prompt builders
// ============================================================

/** System prompt — frames Gemini as a cinematic art director. */
export const QUOTE_THUMBNAIL_SYSTEM_PROMPT = `
You are a cinematic art director and visual prompt generator for a premium
quote library inside a personal-growth operating system called "My Best Life
OS". The user just saved a meaningful quote and wants every quote card to
carry a beautiful editorial background that subtly matches the quote's
emotional weight.

Based on the quote text, author, tags, and category, return STRUCTURED
visual direction PLUS a final, ready-to-render image-generation prompt.

Style requirements (non-negotiable):
- Premium, dark, editorial, cinematic, atmospheric.
- Liquid-glass compatible: soft depth, subtle bloom, gentle film-grain.
- Strong negative space (left or right side, or upper third) so white quote
  typography can sit on top with high readability.
- Low contrast composition. No aggressive saturation.

Forbidden in the image:
- Any readable text, typography, watermarks, logos, signatures.
- Human faces or recognizable people, unless the symbolism truly demands a
  silhouette in deep shadow.
- Generic motivational poster aesthetic, busy stock-photo composition,
  clutter, or overly literal scene depictions.
- AI artifacts (extra fingers, deformed shapes, wobbly geometry).

Mood mapping hints (broad, not strict):
- Mindfulness / peace → deep navy, charcoal, emerald haze, mist, still water,
  moonlight, quiet horizon, minimal particles.
- Ambition / discipline → graphite, warm gold rim light, vertical or upward
  motion, dark structural symbolism, refined contrast.
- Love / warmth → muted burgundy, rose-gold haze, soft glow, warm shadows.
- Courage / resilience → stormy blues, silver highlights, breaking clouds,
  beam of light, restrained dramatic tension.
- Creativity → deep violet, ink-like gradients, painterly trails.
- Wisdom → black, ivory, antique gold, library warmth, soft spotlight.
- Grief / healing → desaturated blue-gray, fog, distant light, spaciousness.

CRITICAL — palette diversity:
The user's library can contain dozens of quotes in the same category (e.g.,
many "Mindfulness" quotes). Two such quotes MUST receive visibly different
color stories. Use the per-quote variation cue and hue anchor in the user
message to bias your palette away from the obvious "deep navy + emerald +
moonlight" default whenever possible. Reach for a fresh combination —
different dominant hue, different lighting setup, different focal layout —
while staying premium-dark and on-mood. Never reuse the exact same color
words you have used before; vary specificity (e.g., "frosted teal", "oxidized
silver", "smoke quartz", "ember orange", "ash violet", "midnight steel",
"copper haze", "muted moss", "graphite plum", "obsidian ivory"…).

Always return a single JSON object that matches the response schema. The
\`image_prompt\` must be self-contained — an image model receiving only that
prompt should produce a beautiful, on-brief background.
`.trim();

/**
 * Variation cues — a deterministic per-quote nudge that pushes Gemini to
 * pick a fresh color story even when two quotes sit in the same mood
 * family. Same quote_id ALWAYS resolves to the same cue, so cards never
 * change between reloads.
 */
const VARIATION_CUES = [
  "lean into a *cooler* end of the family palette (icier blues, paler silvers, frost-bitten greens) and prefer a left-side negative-space composition",
  "lean into a *warmer* end of the family palette (amber rim light, copper bloom, candle glow) and prefer a right-side negative-space composition",
  "use a *jewel-tone* accent (deep emerald, sapphire, garnet, amethyst) against an otherwise muted palette; off-center focal point, top third negative space",
  "use a *metallic* accent (antique gold, brushed steel, oxidized silver) and stage the composition with a soft horizon line",
  "stage a *moody fog* atmosphere with a single distant light source and pronounced upper-third negative space",
  "stage an *ink-bleed / painterly* composition with elongated soft trails and lower-third negative space",
  "stage a *low-key chiaroscuro* lighting setup — single rim of light at the edge, deep shadows everywhere else",
  "stage an *abstract architectural* shadow play — implied rectilinear forms dissolving into haze",
  "stage a *star-field / dust-bloom* atmosphere with tiny luminous specks and large negative space",
  "stage a *liquid mercury / silk drape* surface texture with subtle depth and quiet specular highlights",
  "stage a *night-water reflection* with one ripple of light and a meditative still surface",
  "stage a *minimal mountain-or-horizon silhouette* in deep shadow with a glowing sky band",
] as const;

function djb2Mod(str: string, modulo: number): number {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h % modulo;
}

/**
 * User-content payload that gets posted into Gemini. We surface every
 * relevant field plus a deterministic mood-family hint AND a per-quote
 * variation cue so two quotes in the same family don't render with the
 * same color story.
 */
export function buildQuoteAnalysisUserText(quote: AnalyzableQuote): string {
  const fallbackFamily = classifyFallbackFamily({
    quote_id: quote.id,
    quote_text: quote.quote_text,
    category: quote.category,
    emotion_tone: quote.emotion_tone,
    tags: quote.tags,
    thumbnail_mood: quote.thumbnail_mood,
  });

  const seed = quote.id ?? quote.quote_text ?? fallbackFamily;
  const cue = VARIATION_CUES[djb2Mod(seed, VARIATION_CUES.length)];
  const hueAnchor = djb2Mod(`${seed}:hue`, 360);

  const lines: string[] = [];
  lines.push(`Quote: """${truncate(quote.quote_text, 1200)}"""`);
  if (quote.source_author?.trim()) {
    lines.push(`Author: ${quote.source_author.trim()}`);
  }
  if (quote.source_context?.trim()) {
    lines.push(`Source / context: ${quote.source_context.trim()}`);
  }
  if (quote.category) lines.push(`Category: ${quote.category}`);
  if (quote.emotion_tone) lines.push(`Emotion tone: ${quote.emotion_tone}`);
  if (quote.tags && quote.tags.length > 0) {
    lines.push(`Tags: ${quote.tags.join(", ")}`);
  }
  lines.push(
    `Mood family hint (deterministic, non-binding): ${fallbackFamily}.`,
  );
  lines.push(
    `Variation cue for THIS quote (must influence the palette + composition so two quotes in the same family never look the same): ${cue}.`,
  );
  lines.push(
    `Optional hue anchor: choose colors that feel anchored around HSL hue ≈ ${hueAnchor}° while staying inside the dark, premium, editorial range. Treat as a starting bias, not a hard rule — adapt for the quote's emotional truth.`,
  );
  lines.push(
    "Return ONLY the JSON object the response schema describes — no commentary.",
  );
  return lines.join("\n");
}

function truncate(s: string, limit: number): string {
  if (s.length <= limit) return s;
  return `${s.slice(0, limit - 1)}…`;
}

// ============================================================
// Public API
// ============================================================

export type AnalyzeQuoteOptions = {
  apiKey: string;
  /** Override the model — defaults to the same flash model used by smart-tagging. */
  model?: string;
  timeoutMs?: number;
};

/**
 * Run Gemini and return structured visual direction. Throws on Gemini
 * failure; the caller is responsible for falling back to a deterministic
 * gradient when this throws.
 */
export async function analyzeQuoteWithGemini(
  quote: AnalyzableQuote,
  options: AnalyzeQuoteOptions,
): Promise<{ direction: VisualDirection; modelUsed: string }> {
  const { data, modelUsed } = await fetchGeminiStructured<unknown>({
    apiKey: options.apiKey,
    model: options.model ?? getGeminiHabitsFlashModel(),
    systemInstruction: QUOTE_THUMBNAIL_SYSTEM_PROMPT,
    userText: buildQuoteAnalysisUserText(quote),
    responseSchema: ThumbnailDirectionGeminiSchema,
    temperature: 0.6,
    maxOutputTokens: 1500,
    timeoutMs: options.timeoutMs ?? 30_000,
  });

  const direction = VisualDirectionSchema.parse(data);
  return { direction, modelUsed };
}

/**
 * Compose the final image prompt from a `VisualDirection` plus the original
 * quote payload. We *prefer* the LLM-authored `image_prompt` (it tends to
 * read most cinematically) but graft on a hard-coded readability + safety
 * tail so we never lose the constraints even if the model drifts.
 */
export function generateQuoteThumbnailPromptFromDirection(
  quote: AnalyzableQuote,
  direction: VisualDirection,
): string {
  const safetyTail =
    "No typography, no readable text, no logos, no watermarks, no human faces, no busy stock-photo composition. Strong negative space for white quote typography overlay. Cinematic dark editorial premium aesthetic. High-resolution, 16:9 landscape, atmospheric, subtle, refined.";

  const llmPrompt = direction.image_prompt.trim();
  if (llmPrompt.length >= 80) {
    if (/no typography|no text|no logos/i.test(llmPrompt)) {
      return llmPrompt;
    }
    return `${llmPrompt} ${safetyTail}`;
  }

  // Fallback assembly when the LLM prompt was too short / generic.
  const tagPart =
    quote.tags && quote.tags.length > 0
      ? `Tags: ${quote.tags.slice(0, 6).join(", ")}.`
      : "";
  return `Create a cinematic abstract editorial background inspired by the quote: "${truncate(
    quote.quote_text,
    260,
  )}"${quote.source_author ? ` (${quote.source_author})` : ""}. ${tagPart} Mood: ${direction.mood}. Tone: ${direction.tone}. Symbolism: ${direction.symbolism.join(", ")}. Visual keywords: ${direction.visual_keywords.join(", ")}. Palette: ${direction.color_palette.join(", ")}. Composition: ${direction.composition_notes} ${safetyTail}`;
}

/**
 * Convenience wrapper — runs the analyzer and returns both the structured
 * direction and the final prompt in one call. Used by the orchestrator.
 */
export async function generateQuoteThumbnailPromptWithGemini(
  quote: AnalyzableQuote,
  options: AnalyzeQuoteOptions,
): Promise<{
  direction: VisualDirection;
  prompt: string;
  modelUsed: string;
}> {
  const { direction, modelUsed } = await analyzeQuoteWithGemini(quote, options);
  const prompt = generateQuoteThumbnailPromptFromDirection(quote, direction);
  return { direction, prompt, modelUsed };
}

// ============================================================
// Deterministic fallback (no Gemini)
// ============================================================

/**
 * Build a `VisualDirection` purely from the deterministic fallback
 * classifier. Used when the Gemini analyzer fails — the row still gets
 * useful metadata so the UI can mood-match the gradient.
 */
export function buildFallbackVisualDirection(
  quote: AnalyzableQuote,
): VisualDirection {
  const config = getFallbackQuoteThumbnailConfig({
    quote_id: quote.id,
    quote_text: quote.quote_text,
    category: quote.category,
    emotion_tone: quote.emotion_tone,
    tags: quote.tags,
    thumbnail_mood: quote.thumbnail_mood,
  });

  const moodFamily = config.family;
  const moodWords: Record<typeof moodFamily, string> = {
    mindfulness: "mindful, contemplative, calm, quiet",
    ambition: "disciplined, ascendant, focused, refined",
    warmth: "tender, warm, intimate, generous",
    courage: "resilient, brave, weathered, hopeful",
    creativity: "expressive, imaginative, painterly, vivid",
    wisdom: "wise, patient, contemplative, deep",
    grief: "tender, healing, spacious, gentle",
    default: "thoughtful, atmospheric, reflective",
  };

  return {
    mood: moodWords[moodFamily],
    tone: moodWords[moodFamily],
    visual_keywords: defaultVisualKeywords(moodFamily),
    color_palette: config.paletteHex,
    composition_notes:
      "Strong negative space on the left third for white quote typography overlay. Soft depth, subtle film grain, low-contrast atmosphere.",
    symbolism: defaultSymbolism(moodFamily),
    image_prompt:
      "Cinematic abstract editorial background, dark premium liquid-glass aesthetic, atmospheric gradient, subtle particles, soft bloom, low-contrast composition. " +
      "No typography, no readable text, no logos, no watermarks, no human faces. " +
      "Strong negative space for white quote typography overlay.",
  };
}

function defaultVisualKeywords(family: string): string[] {
  switch (family) {
    case "mindfulness":
      return ["mist", "moonlight", "still water", "soft particles", "quiet horizon"];
    case "ambition":
      return ["graphite shadow", "warm gold rim light", "vertical motion", "subtle architecture"];
    case "warmth":
      return ["rose-gold haze", "soft glow", "warm shadows", "elegant blur"];
    case "courage":
      return ["stormy blue", "silver highlights", "breaking cloud", "beam of light"];
    case "creativity":
      return ["ink trails", "violet bloom", "painterly streaks", "layered depth"];
    case "wisdom":
      return ["soft spotlight", "antique gold", "library warmth", "ivory haze"];
    case "grief":
      return ["fog", "distant light", "soft horizon", "spacious shadows"];
    default:
      return ["soft gradient", "atmospheric depth", "quiet bloom", "subtle particles"];
  }
}

function defaultSymbolism(family: string): string[] {
  switch (family) {
    case "mindfulness":
      return ["release", "stillness", "presence"];
    case "ambition":
      return ["ascent", "discipline", "vision"];
    case "warmth":
      return ["connection", "tenderness", "belonging"];
    case "courage":
      return ["resilience", "endurance", "breakthrough"];
    case "creativity":
      return ["expression", "imagination", "discovery"];
    case "wisdom":
      return ["clarity", "patience", "perspective"];
    case "grief":
      return ["healing", "release", "memory"];
    default:
      return ["reflection", "depth", "intention"];
  }
}
