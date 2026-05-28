import { GoogleGenAI, Modality } from "@google/genai";
import { extractInlineImageFromResponse } from "@/lib/ai/gemini-image";

export function buildIdeaCardIconPrompt(params: {
  title: string;
  summary: string;
  tags: string[];
  palette: string[];
}): string {
  const palette = params.palette.length > 0 ? params.palette.join(", ") : "#22c55e, #38bdf8, #f97316";
  return [
    "Create a single square geometric illustrative icon for an idea card.",
    "Style: minimal abstract line art, clean vector-like shapes, 3-5 colored strokes, subtle dark transparent background, no text, no letters, no logos, no watermark, no photorealism.",
    "Composition: centered, generous padding, readable at 120px, colorful but restrained.",
    `Palette hint: ${palette}.`,
    `Idea title: ${params.title}`,
    `Idea summary: ${params.summary}`,
    `Idea tags: ${params.tags.slice(0, 8).join(", ")}`,
  ].join("\n");
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
      temperature: 0.55,
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
