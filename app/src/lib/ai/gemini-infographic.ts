import { GoogleGenAI, Modality } from "@google/genai";
import { extractInlineImageFromResponse } from "@/lib/ai/gemini-image";
import type { InfographicStyle } from "@/lib/document-brain/infographicStyles";
import { getInfographicStylePreset } from "@/lib/document-brain/infographicStyles";

export type InfographicAspectRatio = "16:9" | "9:16" | "4:3" | "1:1";

function aspectRatioInstruction(ar: InfographicAspectRatio): string {
  switch (ar) {
    case "16:9":
      return "Canvas composition: wide 16:9 presentation slide.";
    case "9:16":
      return "Canvas composition: tall 9:16 story / mobile poster.";
    case "4:3":
      return "Canvas composition: classic 4:3 slide proportions.";
    case "1:1":
      return "Canvas composition: square 1:1 social post.";
    default:
      return "Canvas composition: balanced infographic layout.";
  }
}

function languageBlock(language: "auto" | "en" | "zh-Hant", docLang: string | null): string {
  if (language === "zh-Hant") {
    return [
      "On-image typography: Traditional Chinese (繁體中文) only for all visible text.",
      "Spoken-style labels are fine, but no Simplified Chinese characters.",
    ].join("\n");
  }
  if (language === "en") {
    return "On-image typography: English only for all visible text.";
  }
  const dl = (docLang || "").toLowerCase();
  if (dl.startsWith("zh")) {
    return [
      "Detect Traditional Chinese document tone; use Traditional Chinese (繁體中文) for on-image text unless the grounded facts are clearly English-only labels.",
    ].join("\n");
  }
  return "On-image typography: match the document’s primary language (likely English) for labels and titles.";
}

export function buildDocOracleInfographicPrompt(params: {
  documentTitle: string;
  aspectRatio: InfographicAspectRatio;
  style: InfographicStyle;
  language: "auto" | "en" | "zh-Hant";
  documentLanguage: string | null;
  groundedFactsBlock: string;
  focusLabels: string[];
  customFocus: string;
}): string {
  const preset = getInfographicStylePreset(params.style);
  const styleLine = preset
    ? `STYLE (“${preset.label}”): ${preset.visualPromptInstruction}`
    : `STYLE: ${params.style}`;

  const focusJoined =
    params.focusLabels.length > 0
      ? params.focusLabels.map((f, i) => `${i + 1}. ${f}`).join("\n")
      : "(none — infer only from grounded facts below)";

  const custom = params.customFocus.trim()
    ? `USER CUSTOM FOCUS:\n${params.customFocus.trim().slice(0, 2000)}`
    : "USER CUSTOM FOCUS: (none)";

  return [
    "You are generating ONE original infographic image for a user-owned PDF that was already parsed.",
    "Hard rules:",
    "- Use ONLY facts present in the GROUNDED FACTS block. If something is missing, omit it — do not invent organizations, numbers, dates, or quotes.",
    "- No fake logos, seals, or brand marks; no watermarks.",
    "- Do not reproduce copyrighted full PDF pages or copy figures/tables verbatim — synthesize new layout graphics.",
    "- Use small source tags like “p.3” near claims when page numbers are known from the facts block.",
    "- Readable large typography; short labels only (no tiny dense paragraphs).",
    aspectRatioInstruction(params.aspectRatio),
    styleLine,
    languageBlock(params.language, params.documentLanguage),
    "",
    `DOCUMENT TITLE: ${params.documentTitle}`,
    "",
    "INFOGRAPHIC FOCUS THEMES (interpret visually, stay faithful):",
    focusJoined,
    "",
    custom,
    "",
    "GROUNDED FACTS (only source of truth):",
    params.groundedFactsBlock.slice(0, 24_000),
    "",
    "Output: a single high-quality infographic image matching the requested composition.",
  ].join("\n");
}

export async function generateDocOracleInfographicImage(params: {
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
      temperature: 0.38,
    },
  });

  const inline = extractInlineImageFromResponse(response);
  if (!inline) {
    throw new Error("gemini_image_missing_inline_data");
  }

  const imageBytes = Buffer.from(inline.data, "base64");
  if (imageBytes.length < 64) {
    throw new Error("gemini_image_empty_bytes");
  }

  return { imageBytes, mimeType: inline.mimeType, promptUsed: params.prompt };
}
