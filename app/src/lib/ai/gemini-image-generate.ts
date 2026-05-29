import { extractInlineImageFromResponse } from "@/lib/ai/gemini-image";
import {
  formatGeminiBillingUserMessage,
  isGeminiQuotaExhausted,
  parseGeminiFailureBody,
  type ParsedGeminiFailure,
} from "@/lib/ai/gemini-errors";

const GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export const DEFAULT_GEMINI_FLASH_IMAGE_MODEL = "gemini-2.5-flash-image";

/** Models with separate quota buckets; tried after primary on 429/5xx/404. */
export const DEFAULT_GEMINI_IMAGE_MODEL_FALLBACKS: readonly string[] = [
  "gemini-3.1-flash-image",
  "gemini-2.5-flash-image",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function buildImageModelTryChain(
  primaryRaw: string | undefined,
  fallbacks: readonly string[] = DEFAULT_GEMINI_IMAGE_MODEL_FALLBACKS,
): string[] {
  const primary = primaryRaw?.trim() || DEFAULT_GEMINI_FLASH_IMAGE_MODEL;
  const pool: string[] = [primary, DEFAULT_GEMINI_FLASH_IMAGE_MODEL, ...fallbacks];
  const out: string[] = [];
  for (const m of pool) {
    if (m.length > 0 && !out.includes(m)) out.push(m);
  }
  return out;
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

export type GeminiInlineImageResult = {
  imageBytes: Buffer;
  mimeType: string;
  modelUsed: string;
};

export type GeminiImageGenerateOutcome =
  | { ok: true; image: GeminiInlineImageResult }
  | {
      ok: false;
      lastFailure: ParsedGeminiFailure;
      modelsTried: string[];
      rawSnippet: string;
    };

/**
 * Try Gemini image models in order until one returns inline image bytes.
 */
export async function generateGeminiInlineImage(params: {
  apiKey: string;
  prompt: string;
  modelChain: string[];
}): Promise<GeminiImageGenerateOutcome> {
  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: params.prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  });

  let lastFailure: ParsedGeminiFailure = {};
  let lastRaw = "";
  const modelsTried: string[] = [];

  for (const model of params.modelChain) {
    modelsTried.push(model);
    try {
      const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
      const res = await fetch(`${endpoint}?key=${encodeURIComponent(params.apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });
      const rawText = await res.text();
      lastRaw = rawText;

      if (!res.ok) {
        lastFailure = parseGeminiFailureBody(rawText);
        const retry =
          isGeminiQuotaExhausted(res.status, rawText) ||
          res.status >= 500 ||
          res.status === 404 ||
          /not\s*found|not supported/i.test(rawText);
        if (retry && modelsTried.length < params.modelChain.length) {
          console.warn(
            `[gemini-image] ${model} http ${res.status}: ${(lastFailure.message ?? rawText).slice(0, 160)}`,
          );
          continue;
        }
        break;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText) as unknown;
      } catch {
        lastFailure = { message: "invalid_json" };
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
            ok: true,
            image: {
              imageBytes,
              mimeType: inline.mimeType || "image/png",
              modelUsed: model,
            },
          };
        }
      }
      lastFailure = { message: "no_inline_image" };
      console.warn(`[gemini-image] ${model}: no_inline_image`);
    } catch (err) {
      lastFailure = { message: err instanceof Error ? err.message : String(err) };
      console.warn(`[gemini-image] ${model} error:`, lastFailure.message);
    }
  }

  return {
    ok: false,
    lastFailure,
    modelsTried,
    rawSnippet: lastRaw.slice(0, 400),
  };
}

export function geminiImageFailureUserMessage(
  lastFailure: ParsedGeminiFailure,
  modelsTried: string[],
): string {
  return formatGeminiBillingUserMessage(lastFailure, modelsTried);
}
