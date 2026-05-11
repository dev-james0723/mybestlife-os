import {
  getGeminiPlannerTextModelChain,
  getGeminiServerApiKey,
  isGeminiRegionBlockedHttpResponse,
} from "@/lib/ai/gemini-text";

/** Gemini inline attachment limit — larger images must use fallback text, not inline multimodal. */
export const GEMINI_INLINE_FILE_MAX_BYTES = 18 * 1024 * 1024;

const GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
/** @deprecated Use GEMINI_INLINE_FILE_MAX_BYTES */
const MAX_INLINE_BYTES = GEMINI_INLINE_FILE_MAX_BYTES;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractResponseText(data: unknown): string {
  if (!isRecord(data)) return "";
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const first = candidates[0];
  if (!isRecord(first)) return "";
  const content = first.content;
  if (!isRecord(content)) return "";
  const parts = content.parts;
  if (!Array.isArray(parts)) return "";
  const texts: string[] = [];
  for (const p of parts) {
    if (!isRecord(p)) continue;
    const t = p.text;
    if (typeof t === "string" && t.length > 0) texts.push(t);
  }
  return texts.join("").trim();
}

function shouldRetryModel(httpStatus: number, bodyText: string): boolean {
  if (httpStatus === 401 || httpStatus === 403) return false;
  if (isGeminiRegionBlockedHttpResponse(httpStatus, bodyText)) return false;
  if (httpStatus === 404) return true;
  const t = bodyText.toLowerCase();
  if (httpStatus === 400) {
    return (
      t.includes("not found") ||
      (t.includes("invalid") && t.includes("model")) ||
      t.includes("is not supported") ||
      t.includes("unsupported")
    );
  }
  return httpStatus >= 500;
}

type ExtractMode = "transcribe" | "describe" | "extract";

export async function extractFileTextViaGemini(params: {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
  mode: ExtractMode;
  /** Short spoken clips: transcribe in whatever language is spoken (no forced English). */
  multilingualSpeech?: boolean;
}): Promise<string> {
  const { bytes, mimeType, fileName, mode, multilingualSpeech } = params;
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (bytes.byteLength > MAX_INLINE_BYTES) {
    throw new Error(
      `File too large for direct AI parsing (${Math.round(bytes.byteLength / 1024 / 1024)}MB > ${Math.round(MAX_INLINE_BYTES / 1024 / 1024)}MB)`,
    );
  }

  const base64 = Buffer.from(bytes).toString("base64");
  const chain = getGeminiPlannerTextModelChain();

  const taskInstruction =
    mode === "transcribe" && multilingualSpeech
      ? "Transcribe all speech in this audio clip verbatim into readable text. Include every language you hear; do not translate to English."
      : mode === "transcribe"
        ? "Transcribe the file content verbatim into readable text."
        : mode === "describe"
          ? "Describe the content in detailed, factual text suitable for summarization."
          : "Extract all readable textual content from the file in reading order.";

  const systemInstruction =
    mode === "transcribe" && multilingualSpeech
      ? `You transcribe short voice clips for a capture app.
Return ONLY valid JSON: {"extractedText":"..."}.
Rules:
- Use the same language(s) and writing system as the speaker (e.g. 中文, 日本語, 한국어, English, mixed).
- Never translate to another language; never romanize unless the speaker did.
- Light punctuation is fine. No markdown or commentary.
- If there is no usable speech, return {"extractedText":""}.`
      : `You convert files into plain text for downstream summarization.
Return ONLY valid JSON: {"extractedText":"..."}.
Rules:
- Preserve source language(s) exactly.
- Keep factual details.
- No markdown.
- If nothing is readable, return {"extractedText":""}.`;

  let lastError = new Error("gemini_unknown");
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]!;
    try {
      const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
      const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType, data: base64 } },
                {
                  text: `File name: ${fileName}\nTask: ${taskInstruction}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });

      const rawText = await res.text();
      if (!res.ok) {
        if (isGeminiRegionBlockedHttpResponse(res.status, rawText)) {
          throw new Error(`gemini_region_blocked: ${rawText.slice(0, 400)}`);
        }
        const canRetry =
          i < chain.length - 1 && shouldRetryModel(res.status, rawText);
        lastError = new Error(`gemini_http_${res.status}: ${rawText.slice(0, 600)}`);
        if (canRetry) continue;
        throw lastError;
      }

      const data = JSON.parse(rawText) as unknown;
      const text = extractResponseText(data);
      if (!text) {
        lastError = new Error("gemini_empty_content");
        if (i < chain.length - 1) continue;
        throw lastError;
      }

      let jsonStr = text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```\s*$/i, "")
          .trim();
      }
      const parsed = JSON.parse(jsonStr) as { extractedText?: string };
      return typeof parsed.extractedText === "string"
        ? parsed.extractedText.trim()
        : "";
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (i < chain.length - 1) continue;
      throw lastError;
    }
  }

  throw lastError;
}
