import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import type { ThumbnailStyle } from "@/types/knowledge";
import {
  KNOWLEDGE_THUMBNAIL_GEMINI_PROMPTS,
  KNOWLEDGE_THUMBNAIL_PLACEHOLDER_GRADIENTS,
  normalizeThumbnailStyle,
  type GeneratableThumbnailStyle,
} from "@/lib/knowledge/thumbnail-style-config";

const GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

/** Match schedule-image / quote-thumbnail: Flash image first; Pro preview often has no free quota. */
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

const IMAGE_MODEL_QUOTA_FALLBACKS = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-3-pro-image-preview",
] as const;

function buildKnowledgeThumbnailModelChain(): string[] {
  const primary =
    process.env.GEMINI_KNOWLEDGE_THUMBNAIL_MODEL?.trim() ||
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

function extractInlineImage(data: unknown): { mimeType: string; data: string } | null {
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

function buildPlaceholderSvg(title: string, style: GeneratableThumbnailStyle): string {
  const { from, to, accent } = KNOWLEDGE_THUMBNAIL_PLACEHOLDER_GRADIENTS[style];
  const displayTitle = title.length > 30 ? title.slice(0, 27) + "..." : title;
  const escaped = displayTitle
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="240" fill="url(#bg)" rx="8"/>
  <text x="200" y="126" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" font-weight="600" fill="${accent}">${escaped}</text>
</svg>`;
}

async function uploadToStorage(
  data: Buffer | Blob,
  ext: string,
  contentType: string,
): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const storagePath = `thumbnails/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("knowledge-thumbnails")
    .upload(storagePath, data, { contentType, upsert: true });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("knowledge-thumbnails").getPublicUrl(storagePath);

  return publicUrl;
}

function toGeneratableStyle(style: ThumbnailStyle): GeneratableThumbnailStyle {
  const normalized = normalizeThumbnailStyle(style);
  if (normalized === "na") return "minimal";
  return normalized;
}

export async function generateThumbnail(params: {
  title: string;
  summary: string;
  style: ThumbnailStyle;
}): Promise<{ url: string }> {
  const generatable = toGeneratableStyle(params.style);
  const apiKey = getGeminiServerApiKey();

  if (apiKey) {
    const stylePrompt = KNOWLEDGE_THUMBNAIL_GEMINI_PROMPTS[generatable];
    const prompt =
      `Generate one 400x240 landscape thumbnail image for a card (knowledge, project, or task).\n` +
      `You must return an actual image in the response (inline image data), not only a text description.\n` +
      `Topic: ${params.title}\n` +
      `Context: ${params.summary.slice(0, 200)}\n` +
      `Style: ${stylePrompt}`;

    const modelChain = buildKnowledgeThumbnailModelChain();
    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    });

    for (const model of modelChain) {
      try {
        const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
        const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });

        const rawText = await res.text();

        if (!res.ok) {
          const status = res.status;
          const quotaOrServer = status === 429 || status >= 500;
          const modelMissing =
            status === 404 || /model.*not\s*found/i.test(rawText) || /unsupported/i.test(rawText);
          if (quotaOrServer || modelMissing) {
            console.error(
              `[knowledge-thumbnail] ${model} http ${status}: ${rawText.slice(0, 280)}`,
            );
            continue;
          }
          console.error(`[knowledge-thumbnail] ${model} failed (${status}): ${rawText.slice(0, 300)}`);
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(rawText) as unknown;
        } catch {
          console.error(`[knowledge-thumbnail] ${model}: invalid JSON from Gemini`);
          continue;
        }

        const image = extractInlineImage(parsed);
        if (!image) {
          console.error(
            `[knowledge-thumbnail] ${model}: no inline image (style=${generatable}). ` +
              `Response snippet: ${rawText.slice(0, 400)}`,
          );
          continue;
        }

        const buffer = Buffer.from(image.data, "base64");
        const ext = image.mimeType.split("/")[1] || "png";
        const url = await uploadToStorage(buffer, ext, image.mimeType);
        return { url };
      } catch (err) {
        console.error(`[knowledge-thumbnail] ${model} error:`, err);
        continue;
      }
    }
  }

  const svg = buildPlaceholderSvg(params.title, generatable);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = await uploadToStorage(blob, "svg", "image/svg+xml");
  return { url };
}
