import { GoogleGenAI, Modality } from "@google/genai";

/** Mirrors chat citation shape; kept local so this module stays server-safe. */
export type DocOracleImageCitation = {
  chunk_id?: string;
  page?: number | null;
  section?: string | null;
  excerpt?: string | null;
};

export type RelatedVisualForImage = {
  id: string;
  title: string;
  type?: string | null;
  page?: number | null;
  image_path?: string | null;
  description?: string | null;
  semantic_category?: string | null;
};

export function extractInlineImageFromResponse(response: unknown): { data: string; mimeType: string } | null {
  if (!response || typeof response !== "object") return null;
  const r = response as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
    }>;
  };
  const parts = r.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const p of parts) {
    if (!p || typeof p !== "object") continue;
    const id = p.inlineData;
    if (!id || typeof id !== "object") continue;
    const data = typeof id.data === "string" ? id.data : "";
    const mimeType = typeof id.mimeType === "string" && id.mimeType ? id.mimeType : "image/png";
    if (data.length > 0) return { data, mimeType };
  }
  return null;
}

function buildVisualExplanationPrompt(params: {
  question: string;
  answer: string;
  citations: DocOracleImageCitation[];
  relatedPages: number[];
  relatedVisuals: RelatedVisualForImage[];
  languageHint: string;
}): string {
  const citeLines = params.citations
    .slice(0, 12)
    .map((c) => {
      const p = c.page != null ? `p.${c.page}` : "p.?";
      const ex = (c.excerpt || "").slice(0, 160);
      return `- ${p}${c.section ? ` (${c.section})` : ""}: ${ex || "(no excerpt)"}`;
    })
    .join("\n");
  const pages = params.relatedPages.slice(0, 16).join(", ");
  const vis = params.relatedVisuals
    .slice(0, 8)
    .map(
      (v) =>
        `- ${v.title || "visual"} (${v.semantic_category || v.type || "type"}) p.${v.page ?? "?"}`,
    )
    .join("\n");

  const lang = params.languageHint.toLowerCase();
  const header =
    lang.startsWith("zh")
      ? [
          "請產出單一張清晰的教育用視覺說明圖（資訊圖 / 懶人包風格），只用下面「文件根據的回答」內可支持的重點。",
          "風格：深色高對比、玻璃質感區塊、箭頭與標註、易讀大字；圖上的文字必須使用繁體中文，且只能是短標籤與小標題，不要貼整段長文。",
          "嚴格遵守：不要捏造文件未提及的事實；不要重製或抄襲受版權保護的來源頁面；不要假官方標誌；不要浮水印。",
          "引用頁碼請用「p. 3」「p. 7」這種格式標在圖上。",
        ].join("\n")
      : [
          "Create ONE clean educational visual explanation / infographic using ONLY points supported by the document-grounded answer below.",
          "Style: dark high-contrast UI, subtle glass panels, arrows and callouts, readable LARGE labels; labels must be in English, short only — no dense paragraphs on the image.",
          "Rules: do not invent facts beyond the answer; do not reproduce copyrighted source pages; no fake official logos; no watermarks.",
          "Page references on the image must look like \"p. 3\", \"p. 7\".",
        ].join("\n");

  return [
    header,
    "",
    "USER QUESTION:",
    params.question.slice(0, 2000),
    "",
    "DOCUMENT-GROUNDED ANSWER (may include Markdown — interpret visually; do not paste verbatim walls of text onto the image):",
    params.answer.slice(0, 6000),
    "",
    "CITED EVIDENCE (grounding only — summarize visually, do not render as tiny dense text):",
    citeLines || "(none)",
    "",
    `KEY PAGES: ${pages || "n/a"}`,
    "",
    "RELATED VISUAL THEMES (echo abstractly — do not copy figures):",
    vis || "(none)",
    "",
    `Output language for on-image labels: ${params.languageHint}`,
  ].join("\n");
}

/**
 * Doc Oracle visual explanation via Gemini image-capable model (e.g. gemini-3-pro-image-preview).
 */
export async function generateDocOracleVisualExplanation(params: {
  apiKey: string;
  model: string;
  question: string;
  answer: string;
  citations: DocOracleImageCitation[];
  relatedPages: number[];
  relatedVisuals: RelatedVisualForImage[];
  languageHint: string;
}): Promise<{ imageBytes: Buffer; mimeType: string; promptUsed: string }> {
  const promptUsed = buildVisualExplanationPrompt({
    question: params.question,
    answer: params.answer,
    citations: params.citations,
    relatedPages: params.relatedPages,
    relatedVisuals: params.relatedVisuals,
    languageHint: params.languageHint,
  });

  const ai = new GoogleGenAI({ apiKey: params.apiKey });

  const response = await ai.models.generateContent({
    model: params.model,
    contents: promptUsed,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      temperature: 0.45,
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

  return { imageBytes, mimeType: inline.mimeType, promptUsed };
}

export function getDocOracleImageModel(): string {
  return process.env.DOCORACLE_IMAGE_MODEL?.trim() || "gemini-3-pro-image-preview";
}

export function getDocOracleImageModelFallback(): string | undefined {
  const f = process.env.DOCORACLE_IMAGE_MODEL_FALLBACK?.trim();
  return f || undefined;
}
