import { extractInlineImageFromResponse } from "@/lib/ai/gemini-image";

/** Bump when thumbnail art direction changes to trigger one-time regeneration. */
export const IDEA_CARD_VISUAL_STYLE_VERSION = "gradient-v1";

const GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

const IMAGE_MODEL_QUOTA_FALLBACKS = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-3-pro-image-preview",
] as const;

/**
 * Fixed Idea Capture thumbnail style — soft minimalist gradient posters (see
 * product reference). One style for every card; palette follows idea mood.
 */
const IDEA_CAPTURE_STYLE = [
  "Style: minimalist vertical poster / card cover. Smooth atmospheric color gradients",
  "(2–3 related hues) that emotionally match the idea — e.g. travel → sky blue + warm peach,",
  "food → warm appetizing tones, legal/business → cool calm blues, creative → soft purple + pink.",
  "A thin white semi-circular arc line in the upper third. Generous negative space, calm and airy,",
  "like a meditation or editorial app cover. Subtle grain is OK. No photorealism, no busy scenes,",
  "no faces, no logos, no UI chrome.",
].join(" ");

export function buildIdeaCardIconPrompt(params: {
  ideaContent: string;
  title: string;
  tags: string[];
  palette?: string[];
}): string {
  const content = params.ideaContent.trim().slice(0, 1200);
  const title = params.title.trim().slice(0, 120);
  const tags = params.tags.slice(0, 8).join(", ");

  return [
    "Create ONE minimalist gradient thumbnail for an Idea Capture card.",
    "You must return an actual image in the response (inline image data), not only text.",
    `Idea title: ${title || "(untitled)"}`,
    `Idea content: ${content}`,
    tags ? `Tags: ${tags}` : "",
    IDEA_CAPTURE_STYLE,
    "Composition: choose gradient colors and a simple symbolic motif (silhouette, horizon,",
    "single object, or abstract shape) that clearly relates to THIS specific idea — not generic art.",
    "The thumbnail must feel tied to the idea topic (e.g. dinner → warm table glow; trademark →",
    "stamp/seal shape; Japan trip → mountain + soft sunrise). Vertical 3:4 card crop, subject centered.",
    "Mandatory: no text, no letters, no numbers, no logo, no watermark, no stock-photo clutter,",
    "no random unrelated imagery, no harsh neon, no 3D renders, no detailed faces.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildIdeaCardImageModelChain(): string[] {
  const primary =
    process.env.IDEA_CARD_ICON_MODEL?.trim() ||
    process.env.GEMINI_SCHEDULE_IMAGE_MODEL?.trim() ||
    DEFAULT_IMAGE_MODEL;
  const pool: string[] = [primary, DEFAULT_IMAGE_MODEL, ...IMAGE_MODEL_QUOTA_FALLBACKS];
  const out: string[] = [];
  for (const m of pool) {
    if (m.length > 0 && !out.includes(m)) out.push(m);
  }
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractInlineImageHttp(data: unknown): { mimeType: string; data: string } | null {
  if (!isRecord(data)) return null;
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  for (const cand of candidates) {
    if (!isRecord(cand)) continue;
    const content = cand.content;
    if (!isRecord(content)) continue;
    const parts = content.parts;
    if (!Array.isArray(parts)) continue;
    for (const part of parts) {
      if (!isRecord(part)) continue;
      const inline =
        (part.inlineData as Record<string, unknown> | undefined) ??
        (part.inline_data as Record<string, unknown> | undefined);
      if (!inline) continue;
      const mime =
        (typeof inline.mimeType === "string" && inline.mimeType) ||
        (typeof inline.mime_type === "string" && inline.mime_type) ||
        "image/png";
      const b64 = inline.data;
      if (typeof b64 === "string" && b64.length > 0) {
        return { mimeType: mime, data: b64 };
      }
    }
  }
  return null;
}

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

  if (params.apiKey) {
    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: params.prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    });

    let lastDetail = "";
    for (const model of modelChain) {
      try {
        const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
        const res = await fetch(`${endpoint}?key=${encodeURIComponent(params.apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });
        const rawText = await res.text();
        if (!res.ok) {
          lastDetail = rawText.slice(0, 400);
          const retry =
            res.status === 429 ||
            res.status >= 500 ||
            res.status === 404 ||
            /quota|resource_exhausted|not\s*found/i.test(rawText);
          if (retry) {
            console.warn(`[idea-card-icon] ${model} http ${res.status}: ${lastDetail.slice(0, 200)}`);
            continue;
          }
          break;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(rawText) as unknown;
        } catch {
          lastDetail = "invalid_json";
          continue;
        }

        const inline =
          extractInlineImageHttp(parsed) ??
          (() => {
            const fromSdk = extractInlineImageFromResponse(parsed);
            return fromSdk ? { mimeType: fromSdk.mimeType, data: fromSdk.data } : null;
          })();

        if (inline) {
          const imageBytes = Buffer.from(inline.data, "base64");
          if (imageBytes.length >= 64) {
            return {
              imageBytes,
              mimeType: inline.mimeType || "image/png",
              modelUsed: model,
              promptUsed: params.prompt,
              source: "gemini",
            };
          }
        }
        lastDetail = "no_inline_image";
        console.warn(`[idea-card-icon] ${model}: ${lastDetail}`);
      } catch (err) {
        lastDetail = err instanceof Error ? err.message : String(err);
        console.warn(`[idea-card-icon] ${model} error:`, lastDetail);
      }
    }
    console.warn("[idea-card-icon] Gemini chain exhausted, using SVG placeholder:", lastDetail);
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
  return buildIdeaCardImageModelChain()[0] ?? DEFAULT_IMAGE_MODEL;
}
