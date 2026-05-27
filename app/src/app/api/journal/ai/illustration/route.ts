import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { parseAppLocale, type AppLocale } from "@/lib/i18n/app-locale";
import {
  buildJournalEntryUserText,
  illustrationStylePrompt,
  JOURNAL_ILLUSTRATION_STYLES,
  type JournalIllustrationStyle,
} from "@/lib/journal/journal-ai-helpers";
import {
  JOURNAL_MEDIA_BUCKET,
  journalIllustrationPath,
  journalMediaPublicUrl,
} from "@/lib/journal/journal-media-storage";

export const runtime = "nodejs";
export const maxDuration = 120;

const GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const IMAGE_MODEL_QUOTA_FALLBACKS = ["gemini-2.0-flash-preview-image-generation"] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function buildImageModelTryChain(primaryRaw: string | undefined): string[] {
  const primary = primaryRaw?.trim() || DEFAULT_IMAGE_MODEL;
  const pool: string[] = [primary, DEFAULT_IMAGE_MODEL, ...IMAGE_MODEL_QUOTA_FALLBACKS];
  const out: string[] = [];
  for (const m of pool) {
    if (m.length > 0 && !out.includes(m)) out.push(m);
  }
  return out;
}

function extractInlineImage(data: unknown): { mimeType: string; data: string } | null {
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

function parseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function parseStyle(v: unknown): JournalIllustrationStyle {
  if (typeof v === "string" && (JOURNAL_ILLUSTRATION_STYLES as readonly string[]).includes(v)) {
    return v as JournalIllustrationStyle;
  }
  return "symbolic_cinematic";
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Image generation is not configured. Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) on the server.",
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isRecord(json)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const entryId = typeof json.entryId === "string" ? json.entryId.trim() : "";
  if (!entryId) {
    return NextResponse.json({ error: "entryId is required" }, { status: 400 });
  }

  parseAppLocale(json.locale);

  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .select("id, user_id")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (entryError) {
    console.error("[journal/ai/illustration] entry_lookup", entryError);
    return NextResponse.json({ error: "Could not load entry" }, { status: 500 });
  }
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const style = parseStyle(json.style);
  const symbolicRatioRaw =
    typeof json.symbolicRatio === "number" ? Math.round(json.symbolicRatio) : 70;
  const symbolicRatio = Math.min(100, Math.max(0, symbolicRatioRaw));
  const literalRatio = 100 - symbolicRatio;

  const bullets = parseStringArray(json.bullets);
  const needs = parseStringArray(json.needs);
  const intensity =
    typeof json.intensity === "number" && json.intensity >= 1 && json.intensity <= 10
      ? json.intensity
      : null;

  const entryContext = buildJournalEntryUserText({
    topic: typeof json.topic === "string" ? json.topic : null,
    quadrant: typeof json.quadrant === "string" ? json.quadrant : null,
    primaryEmotion: typeof json.primaryEmotion === "string" ? json.primaryEmotion : null,
    secondaryEmotion: typeof json.secondaryEmotion === "string" ? json.secondaryEmotion : null,
    intensity,
    bullets,
    needs,
    aiSummary: typeof json.summary === "string" ? json.summary : null,
  });

  const styleText = illustrationStylePrompt(style);

  const prompt = `Create a square-friendly symbolic illustration for a private journal entry.

No text, no letters, no watermark.
No logos, no brands.
Avoid identifiable real people.
Use symbolic objects, light, weather, rooms, nature, abstract silhouettes, or cinematic atmosphere.

The image should represent:
- the journal topic
- the emotional quadrant
- the primary emotion and intensity
- the needs
- the core situation from the entry
- the AI summary, if provided

Style preset:
${styleText}

Symbolic vs literal ratio:
${symbolicRatio}% symbolic, ${literalRatio}% literal.

Palette and lighting should follow the quadrant:
- high pleasantness + high activation: bright, energetic, warm light
- high pleasantness + low activation: soft, calm, peaceful light
- low pleasantness + high activation: tense, contrast, sharp energy
- low pleasantness + low activation: muted, quiet, heavy but not hopeless

Return image only.

Journal entry context:
${entryContext}`;

  const modelChain = buildImageModelTryChain(process.env.GEMINI_SCHEDULE_IMAGE_MODEL);
  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  let picked: { mimeType: string; data: string } | null = null;
  let modelUsed = modelChain[modelChain.length - 1] ?? DEFAULT_IMAGE_MODEL;
  let lastRawText = "";

  for (const model of modelChain) {
    modelUsed = model;
    const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
    const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    const rawText = await res.text();
    lastRawText = rawText;

    if (!res.ok) {
      const quotaHit = res.status === 429;
      const idx = modelChain.indexOf(model);
      if (quotaHit && idx < modelChain.length - 1) continue;
      console.error("[journal/ai/illustration] gemini", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "Gemini image request failed", detail: rawText.slice(0, 800), model },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      return NextResponse.json(
        { error: "Invalid response from Gemini", detail: rawText.slice(0, 500), model },
        { status: 502 },
      );
    }

    picked = extractInlineImage(parsed);
    if (picked) break;

    const idx = modelChain.indexOf(model);
    if (idx < modelChain.length - 1) continue;
  }

  if (!picked) {
    console.error("[journal/ai/illustration] no_image", lastRawText.slice(0, 500));
    return NextResponse.json(
      { error: "No image returned by the model", model: modelUsed },
      { status: 502 },
    );
  }

  const imageBytes = Buffer.from(picked.data, "base64");
  const storagePath = journalIllustrationPath(user.id, entryId);
  const contentType = picked.mimeType.includes("jpeg") ? "image/jpeg" : "image/png";

  const { error: uploadError } = await supabase.storage
    .from(JOURNAL_MEDIA_BUCKET)
    .upload(storagePath, imageBytes, { contentType, upsert: true });

  if (uploadError) {
    console.error("[journal/ai/illustration] storage", uploadError);
    return NextResponse.json({ error: "Storage upload failed" }, { status: 502 });
  }

  const imageUrl = journalMediaPublicUrl(supabase, storagePath);

  const { error: updateError } = await supabase
    .from("journal_entries")
    .update({
      ai_illustration_url: imageUrl,
      ai_illustration_style: style,
      ai_illustration_symbolic_ratio: symbolicRatio,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[journal/ai/illustration] db_update", updateError);
    return NextResponse.json({ error: "Could not save illustration URL" }, { status: 502 });
  }

  return NextResponse.json({
    imageUrl,
    mimeType: contentType,
    model: modelUsed,
  });
}
