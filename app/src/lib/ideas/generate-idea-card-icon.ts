import { GoogleGenAI, Modality } from "@google/genai";
import { extractInlineImageFromResponse } from "@/lib/ai/gemini-image";

const GEOMETRY_BRAND_STYLE = [
  "My Best Life OS / Geometry brand: minimalist illustrative line art,",
  "clean vector strokes, subtle dark or near-black background,",
  "3–5 accent strokes in emerald (#22c55e), sky (#38bdf8), amber (#f97316),",
  "occasional violet (#e879f9); Bauhaus-meets-tech geometry,",
  "circles and arcs used sparingly as framing, not random decoration.",
].join(" ");

export function buildIdeaCardIconPrompt(params: {
  ideaContent: string;
  title: string;
  tags: string[];
  palette: string[];
}): string {
  const palette =
    params.palette.length > 0 ? params.palette.join(", ") : "#22c55e, #38bdf8, #f97316";
  const content = params.ideaContent.trim().slice(0, 1200);
  const title = params.title.trim().slice(0, 120);
  const tags = params.tags.slice(0, 8).join(", ");

  return [
    "Create ONE portrait illustration for the left panel of an idea card (aspect ratio 2:3, taller than wide).",
    GEOMETRY_BRAND_STYLE,
    "CRITICAL: The drawing MUST visually represent the specific idea below —",
    "use recognizable metaphors and objects (e.g. airplane wings for flying, piano keys for music).",
    "Do NOT output generic abstract squiggles, random circles, or unrelated geometry.",
    "Style: simplified illustrative line art only — no text, no letters, no watermark, no photorealism.",
    "Fill the vertical frame; subject centered with breathing room at top and bottom.",
    `Accent palette: ${palette}.`,
    `Idea title (context): ${title || "(untitled)"}`,
    `Idea content (must inspire the illustration): ${content}`,
    tags ? `Tags: ${tags}` : "",
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
