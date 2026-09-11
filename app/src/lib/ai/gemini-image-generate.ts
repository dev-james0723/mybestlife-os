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
      // Some image models include intermediate thought images before the final image.
      if (!isRecord(part) || part.thought === true) continue;
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
 * Try only the supplied Gemini models. Pass a single model for no automatic fallback.
 * Optional scene controls leave existing callers' request defaults unchanged.
 */
export async function generateGeminiInlineImage(params: {
  apiKey: string;
  prompt: string;
  modelChain: string[];
  signal?: AbortSignal;
  aspectRatio?: string;
  /** Reject oversized base64 data before allocating its decoded Buffer. */
  maxInlineDataLength?: number;
}): Promise<GeminiImageGenerateOutcome> {
  params.signal?.throwIfAborted();
  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: params.prompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      ...(params.aspectRatio ? { imageConfig: { aspectRatio: params.aspectRatio } } : {}),
    },
  });

  let lastFailure: ParsedGeminiFailure = {};
  let lastRaw = "";
  const modelsTried: string[] = [];

  for (const model of params.modelChain) {
    params.signal?.throwIfAborted();
    modelsTried.push(model);
    try {
      const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": params.apiKey },
        body: requestBody,
        signal: params.signal,
      });
      const rawText = await res.text();
      params.signal?.throwIfAborted();
      lastRaw = rawText;

      if (!res.ok) {
        lastFailure = { ...parseGeminiFailureBody(rawText), code: res.status };
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

      // This parser handles both camelCase and snake_case inline data. Do not fall
      // back to the SDK extractor, which could return an intermediate thought image.
      const inline = extractInlineImageHttp(parsed);
      if (inline) {
        if (params.maxInlineDataLength !== undefined && inline.data.length > params.maxInlineDataLength) {
          lastFailure = { message: "inline_image_too_large" };
          break;
        }
        const imageBytes = Buffer.from(inline.data, "base64");
        if (imageBytes.length >= 64) {
          params.signal?.throwIfAborted();
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
      // Cancellation/timeout must escape, never trigger another billed request.
      params.signal?.throwIfAborted();
      if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) throw err;
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
