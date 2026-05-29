import {
  buildImageModelTryChain,
  DEFAULT_GEMINI_FLASH_IMAGE_MODEL,
  DEFAULT_GEMINI_IMAGE_MODEL_FALLBACKS,
  generateGeminiInlineImage,
  geminiImageFailureUserMessage,
} from "@/lib/ai/gemini-image-generate";
import { isGeminiPrepayCreditsDepleted } from "@/lib/ai/gemini-errors";

/** Bump when thumbnail art direction changes to trigger one-time regeneration. */
export const IDEA_CARD_VISUAL_STYLE_VERSION = "gradient-v2";

/**
 * Idea Capture uses its own model env — do not inherit GEMINI_SCHEDULE_IMAGE_MODEL
 * (Daily Planner may point at Pro/prepay-only models).
 */
export function buildIdeaCardImageModelChain(): string[] {
  const primary = process.env.IDEA_CARD_ICON_MODEL?.trim() || DEFAULT_GEMINI_FLASH_IMAGE_MODEL;
  return buildImageModelTryChain(primary, DEFAULT_GEMINI_IMAGE_MODEL_FALLBACKS);
}

export { buildIdeaCardIconPrompt, summarizeIdeaVisualTopic } from "@/lib/ideas/idea-card-visual-prompt";

/** Deterministic palette when Gemini does not supply hex colors. */
export function defaultIdeaCardPalette(seed: string): string[] {
  const palettes = [
    ["#7dd3fc", "#fdba74", "#6366f1"],
    ["#a5b4fc", "#fbcfe8", "#38bdf8"],
    ["#86efac", "#fde68a", "#60a5fa"],
    ["#c4b5fd", "#fda4af", "#7dd3fc"],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length]!;
}

export function buildIdeaCardPlaceholderSvg(params: {
  title: string;
  palette: string[];
}): string {
  const [top, mid, bottom] =
    params.palette.length >= 3
      ? params.palette
      : defaultIdeaCardPalette(params.title);
  const label = (params.title || "Idea").slice(0, 24).replace(/[<>&"]/g, "");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${top}"/>
      <stop offset="55%" stop-color="${mid}"/>
      <stop offset="100%" stop-color="${bottom}"/>
    </linearGradient>
  </defs>
  <rect width="480" height="640" fill="url(#bg)"/>
  <path d="M 120 120 A 120 120 0 0 1 360 120" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>
  <text x="240" y="560" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="500" letter-spacing="0.2em" fill="rgba(255,255,255,0.72)">${label}</text>
</svg>`;
}

export type IdeaCardThumbnailResult = {
  imageBytes: Buffer;
  mimeType: string;
  modelUsed: string;
  promptUsed: string;
  source: "gemini" | "placeholder";
  /** Set when Gemini failed due to billing/quota but a placeholder was returned. */
  geminiWarning?: string;
};

/**
 * Try Gemini image models (Flash first), then a local SVG gradient placeholder
 * so every idea card always gets a thumbnail URL.
 */
export async function generateIdeaCardThumbnail(params: {
  apiKey: string | null;
  prompt: string;
  title: string;
  palette: string[];
}): Promise<IdeaCardThumbnailResult> {
  const modelChain = buildIdeaCardImageModelChain();
  let geminiWarning: string | undefined;

  if (params.apiKey) {
    const outcome = await generateGeminiInlineImage({
      apiKey: params.apiKey,
      prompt: params.prompt,
      modelChain,
    });

    if (outcome.ok) {
      return {
        imageBytes: outcome.image.imageBytes,
        mimeType: outcome.image.mimeType,
        modelUsed: outcome.image.modelUsed,
        promptUsed: params.prompt,
        source: "gemini",
      };
    }

    geminiWarning = geminiImageFailureUserMessage(outcome.lastFailure, outcome.modelsTried);
    if (
      isGeminiPrepayCreditsDepleted(
        outcome.lastFailure.code ?? 429,
        outcome.lastFailure.message ?? outcome.rawSnippet,
      )
    ) {
      console.warn("[idea-card-icon] Gemini prepay credits depleted — using SVG placeholder");
    } else {
      console.warn("[idea-card-icon] Gemini chain exhausted:", geminiWarning.slice(0, 200));
    }
  } else {
    geminiWarning = "GEMINI_API_KEY is not configured on the server.";
  }

  const svg = buildIdeaCardPlaceholderSvg({
    title: params.title,
    palette: params.palette.length > 0 ? params.palette : defaultIdeaCardPalette(params.title),
  });
  return {
    imageBytes: Buffer.from(svg, "utf8"),
    mimeType: "image/svg+xml",
    modelUsed: "placeholder-svg",
    promptUsed: params.prompt,
    source: "placeholder",
    geminiWarning,
  };
}

/** @deprecated Use {@link generateIdeaCardThumbnail} — kept for imports. */
export async function generateIdeaCardIconImage(params: {
  apiKey: string;
  model: string;
  prompt: string;
}): Promise<{ imageBytes: Buffer; mimeType: string; promptUsed: string }> {
  const result = await generateIdeaCardThumbnail({
    apiKey: params.apiKey,
    prompt: params.prompt,
    title: "",
    palette: [],
  });
  return {
    imageBytes: result.imageBytes,
    mimeType: result.mimeType,
    promptUsed: result.promptUsed,
  };
}

export function getIdeaCardIconModel(): string {
  return buildIdeaCardImageModelChain()[0] ?? DEFAULT_GEMINI_FLASH_IMAGE_MODEL;
}
