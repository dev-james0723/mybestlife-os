import { GoogleGenAI, Modality } from "@google/genai";
import { extractInlineImageFromResponse } from "@/lib/ai/gemini-image";

/**
 * Fixed Idea Capture illustration style — a refined notebook illustration for
 * a personal knowledge system. Warm ivory paper, minimalist black ink line
 * art, one small muted orange accent. There is intentionally NO style picker;
 * every idea card uses this single style.
 */
const IDEA_CAPTURE_STYLE = [
  "Style: warm ivory paper background, minimalist hand-drawn black ink line art,",
  "fine ink strokes with subtle cross-hatching, clean Japanese editorial / notebook",
  "illustration feeling. Add only ONE small muted orange accent detail where it fits",
  "(a sun, a dot, or a tiny object accent) — nothing more.",
].join(" ");

export function buildIdeaCardIconPrompt(params: {
  ideaContent: string;
  title: string;
  tags: string[];
  /** Accepted for backwards-compat; the Idea Capture style is fixed and ignores it. */
  palette?: string[];
}): string {
  const content = params.ideaContent.trim().slice(0, 1200);
  const title = params.title.trim().slice(0, 120);
  const tags = params.tags.slice(0, 8).join(", ");

  return [
    "Create ONE editorial line-art illustration for an Idea Capture card.",
    `Idea title: ${title || "(untitled)"}`,
    `Idea content: ${content}`,
    tags ? `Tags: ${tags}` : "",
    IDEA_CAPTURE_STYLE,
    "Composition: use recognizable objects or metaphors that clearly represent the idea",
    "(e.g. travel → landmarks/luggage/train; business → product/market/chart; music → instruments;",
    "family → home/together without detailed faces). The image must make sense even without reading",
    "the card. Center the subject with breathing room. Designed for a vertical card thumbnail crop.",
    "Mandatory: no text, no letters, no numbers, no logo, no watermark, no random abstract squiggles,",
    "no random circles, no generic geometry, no photorealism, no distorted hands,",
    "no faces unless absolutely necessary, no cheap colorful gradients, no generic SaaS icons.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateIdeaCardIconImage(params: {
  apiKey: string;
  model: string;
  prompt: string;
}): Promise<{ imageBytes: Buffer; mimeType: string; promptUsed: string }> {
  const ai = new GoogleGenAI({ apiKey: params.apiKey });
  const response = await ai.models.generateContent({
    model: params.model,
    contents: params.prompt,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      temperature: 0.45,
    },
  });

  const inline = extractInlineImageFromResponse(response);
  if (!inline) throw new Error("idea_icon_missing_inline_data");

  const imageBytes = Buffer.from(inline.data, "base64");
  if (imageBytes.length < 64) throw new Error("idea_icon_empty_bytes");

  return { imageBytes, mimeType: inline.mimeType, promptUsed: params.prompt };
}

export function getIdeaCardIconModel(): string {
  return (
    process.env.IDEA_CARD_ICON_MODEL?.trim() ||
    process.env.DOCORACLE_IMAGE_MODEL?.trim() ||
    "gemini-3-pro-image-preview"
  );
}
