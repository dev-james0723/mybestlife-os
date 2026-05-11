/**
 * Gemini image generation for quote thumbnails.
 *
 * Mirrors the model fallback strategy used by the Daily Planner schedule-image
 * route — we try the configured primary model first, then `gemini-2.5-flash-image`,
 * then the `*-preview-image-generation` family on quota exhaustion.
 */

const GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_QUOTE_THUMBNAIL_MODEL = "gemini-2.5-flash-image";

const QUOTE_THUMBNAIL_MODEL_QUOTA_FALLBACKS = [
  "gemini-2.0-flash-preview-image-generation",
] as const;

export type GeneratedQuoteImage = {
  /** Raw bytes (PNG / WEBP / JPEG depending on the model). */
  bytes: Uint8Array;
  mimeType: string;
  modelUsed: string;
  modelsTried: string[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getEnvImageModel(): string {
  return (
    process.env.GEMINI_QUOTE_THUMBNAIL_MODEL?.trim() ||
    process.env.GEMINI_SCHEDULE_IMAGE_MODEL?.trim() ||
    DEFAULT_QUOTE_THUMBNAIL_MODEL
  );
}

function buildImageModelTryChain(primaryRaw?: string): string[] {
  const primary = primaryRaw?.trim() || getEnvImageModel();
  const pool: string[] = [
    primary,
    DEFAULT_QUOTE_THUMBNAIL_MODEL,
    ...QUOTE_THUMBNAIL_MODEL_QUOTA_FALLBACKS,
  ];
  const out: string[] = [];
  for (const m of pool) {
    if (m && m.length > 0 && !out.includes(m)) out.push(m);
  }
  return out;
}

function extractInlineImage(
  data: unknown,
): { mimeType: string; data: string } | null {
  if (!isRecord(data)) return null;
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const first = candidates[0];
  if (!isRecord(first)) return null;
  const content = first.content;
  if (!isRecord(content)) return null;
  const parts = content.parts;
  if (!Array.isArray(parts)) return null;
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
  return null;
}

function decodeBase64(b64: string): Uint8Array {
  const buffer = Buffer.from(b64, "base64");
  return new Uint8Array(buffer);
}

export type GenerateQuoteThumbnailImageOptions = {
  apiKey: string;
  prompt: string;
  /** Optional override; defaults read `GEMINI_QUOTE_THUMBNAIL_MODEL` then `GEMINI_SCHEDULE_IMAGE_MODEL`. */
  primaryModel?: string;
};

export class QuoteThumbnailImageError extends Error {
  readonly status: number;
  readonly modelsTried: string[];
  readonly retryable: boolean;
  constructor(message: string, opts: { status: number; modelsTried: string[]; retryable: boolean }) {
    super(message);
    this.name = "QuoteThumbnailImageError";
    this.status = opts.status;
    this.modelsTried = opts.modelsTried;
    this.retryable = opts.retryable;
  }
}

/**
 * Render the thumbnail image. Returns raw bytes + metadata so the caller can
 * upload them to whichever storage layer it likes (Supabase by default).
 */
export async function generateQuoteThumbnailImage(
  options: GenerateQuoteThumbnailImageOptions,
): Promise<GeneratedQuoteImage> {
  const { apiKey, prompt } = options;
  if (!apiKey) {
    throw new QuoteThumbnailImageError("missing_gemini_api_key", {
      status: 500,
      modelsTried: [],
      retryable: false,
    });
  }
  if (!prompt || prompt.trim().length < 20) {
    throw new QuoteThumbnailImageError("prompt_too_short", {
      status: 400,
      modelsTried: [],
      retryable: false,
    });
  }

  const modelChain = buildImageModelTryChain(options.primaryModel);
  const requestBody = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  let lastDetail = "";
  let lastStatus = 502;

  for (const model of modelChain) {
    const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
    let res: Response;
    try {
      res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });
    } catch (e) {
      lastDetail = e instanceof Error ? e.message : String(e);
      lastStatus = 502;
      continue;
    }

    const rawText = await res.text();
    if (!res.ok) {
      lastDetail = rawText.slice(0, 1200);
      lastStatus = res.status;
      const isQuota =
        res.status === 429 ||
        /resource_exhausted/i.test(rawText) ||
        /\bquota\b/i.test(rawText);
      const isModelMissing =
        res.status === 404 ||
        /model.*not\s*found/i.test(rawText) ||
        /unsupported/i.test(rawText);
      if (isQuota || isModelMissing) continue;
      throw new QuoteThumbnailImageError(
        `gemini_image_http_${res.status}: ${rawText.slice(0, 600)}`,
        {
          status: res.status,
          modelsTried: modelChain.slice(0, modelChain.indexOf(model) + 1),
          retryable: false,
        },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      lastDetail = "invalid_json_response";
      continue;
    }

    const picked = extractInlineImage(parsed);
    if (picked) {
      return {
        bytes: decodeBase64(picked.data),
        mimeType: picked.mimeType,
        modelUsed: model,
        modelsTried: modelChain.slice(0, modelChain.indexOf(model) + 1),
      };
    }

    lastDetail = "no_image_in_response";
    lastStatus = 502;
  }

  throw new QuoteThumbnailImageError(
    `gemini_image_failed: ${lastDetail.slice(0, 400)}`,
    {
      status: lastStatus,
      modelsTried: modelChain,
      retryable: lastStatus === 429 || lastStatus >= 500,
    },
  );
}

/**
 * Returns the file extension for a given mime type. Falls back to `png`
 * because every model in the chain emits PNG by default.
 */
export function mimeToExt(mime: string): "png" | "jpg" | "webp" {
  const m = mime.toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  return "png";
}
