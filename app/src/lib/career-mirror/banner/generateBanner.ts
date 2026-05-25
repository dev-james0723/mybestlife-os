/**
 * generateCareerBanner — renders a 16:9 (1920x1080) AI Career Mirror identity
 * banner from a chosen style + the person's identity/summary, uploads it to the
 * `career-banners` bucket, and returns its public URL.
 *
 * Mirrors the image-model chain approach in
 * `@/lib/knowledge/ai/generateThumbnail` (Flash image first, quota fallbacks),
 * and falls back to `buildCareerBannerSvgPlaceholder` (status 'fallback') on any
 * failure. The prompt forbids text/logos and asks for deliberate negative space
 * for an overlay; an optional portrait is included as an inlineData part.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  CAREER_BANNER_GEMINI_PROMPTS,
  buildCareerBannerSvgPlaceholder,
  type CareerBannerStyle,
} from "@/lib/career-mirror/banner/career-banner-style-config";
import { uploadCareerBannerToSupabase } from "@/lib/career-mirror/banner/upload";

const GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

/** Match schedule-image / quote-thumbnail: Flash image first; Pro preview often has no free quota. */
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

const IMAGE_MODEL_QUOTA_FALLBACKS = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-3-pro-image-preview",
] as const;

export type CareerBannerStatus = "completed" | "fallback";

export type GeneratedCareerBanner = {
  url: string;
  prompt: string;
  style: CareerBannerStyle;
  status: CareerBannerStatus;
  modelUsed: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function buildBannerModelChain(): string[] {
  const primary =
    process.env.GEMINI_CAREER_BANNER_MODEL?.trim() ||
    process.env.GEMINI_SCHEDULE_IMAGE_MODEL?.trim() ||
    DEFAULT_IMAGE_MODEL;
  const pool: string[] = [primary, DEFAULT_IMAGE_MODEL, ...IMAGE_MODEL_QUOTA_FALLBACKS];
  const out: string[] = [];
  for (const m of pool) {
    if (m.length > 0 && !out.includes(m)) out.push(m);
  }
  return out;
}

function extractInlineImage(
  data: unknown,
): { mimeType: string; data: string } | null {
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

/** Split a `data:<mime>;base64,<data>` URL into its parts. */
function parseDataUrl(
  dataUrl: string,
): { mimeType: string; data: string } | null {
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl.trim());
  if (!m) return null;
  return { mimeType: m[1]!, data: m[2]! };
}

function buildBannerPrompt(params: {
  style: CareerBannerStyle;
  identity: string;
  summary: string;
  withPortrait: boolean;
}): string {
  const stylePrompt = CAREER_BANNER_GEMINI_PROMPTS[params.style];
  const portraitClause = params.withPortrait
    ? "A portrait reference of the subject is attached — base the human likeness " +
      "on it naturally and respectfully.\n"
    : "";
  return (
    "Generate ONE 16:9 (1920x1080) cinematic identity banner image. " +
    "You must return an actual image in the response (inline image data), not a " +
    "text description.\n" +
    portraitClause +
    `Career identity: ${params.identity.slice(0, 300)}\n` +
    `Context: ${params.summary.slice(0, 400)}\n` +
    `Style: ${stylePrompt}`
  );
}

export async function generateCareerBanner(params: {
  userId: string;
  style: CareerBannerStyle;
  identity: string;
  summary: string;
  portraitDataUrl?: string;
  supabase: SupabaseClient;
}): Promise<GeneratedCareerBanner> {
  const { userId, style, identity, summary, portraitDataUrl, supabase } = params;
  const portrait = portraitDataUrl ? parseDataUrl(portraitDataUrl) : null;
  const prompt = buildBannerPrompt({
    style,
    identity,
    summary,
    withPortrait: !!portrait,
  });

  const apiKey = getGeminiServerApiKey();

  if (apiKey) {
    const userParts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (portrait) {
      userParts.push({
        inlineData: { mimeType: portrait.mimeType, data: portrait.data },
      });
    }
    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts: userParts }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    });

    const modelChain = buildBannerModelChain();
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
          console.error(
            `[career-banner] ${model} http ${res.status}: ${rawText.slice(0, 280)}`,
          );
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(rawText) as unknown;
        } catch {
          console.error(`[career-banner] ${model}: invalid JSON from Gemini`);
          continue;
        }

        const image = extractInlineImage(parsed);
        if (!image) {
          console.error(
            `[career-banner] ${model}: no inline image (style=${style}).`,
          );
          continue;
        }

        const bytes = Buffer.from(image.data, "base64");
        const uploaded = await uploadCareerBannerToSupabase({
          supabase,
          userId,
          bytes,
          mimeType: image.mimeType,
        });
        return {
          url: uploaded.publicUrl,
          prompt,
          style,
          status: "completed",
          modelUsed: model,
        };
      } catch (err) {
        console.error(`[career-banner] ${model} error:`, err);
        continue;
      }
    }
  }

  // Fallback: deterministic SVG placeholder for the chosen style.
  const svg = buildCareerBannerSvgPlaceholder(style, { seed: userId });
  const uploaded = await uploadCareerBannerToSupabase({
    supabase,
    userId,
    bytes: new Blob([svg], { type: "image/svg+xml" }),
    mimeType: "image/svg+xml",
  });
  return {
    url: uploaded.publicUrl,
    prompt,
    style,
    status: "fallback",
    modelUsed: null,
  };
}
