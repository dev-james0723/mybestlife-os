import { NextResponse } from "next/server";
import { z } from "zod";

import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { buildIllustrationPrompt } from "@/lib/journal/ai-prompts";
import { generateJournalImage } from "@/lib/journal/gemini-media";
import { illustrationRequestSchema } from "@/lib/journal/schema";
import { uploadJournalIllustration } from "@/lib/journal/storage";
import { parseBody, requireAuthedContext } from "../_shared";

export const runtime = "nodejs";

// entryId is required for illustration so we can scope the storage path +
// persist `ai_media.image` back to the row.
const requestSchema = illustrationRequestSchema.extend({
  entryId: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;

  const parsed = parseBody(requestSchema, auth.bodyJson);
  if (!parsed.ok) return parsed.response;

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_gemini_api_key" },
      { status: 500 },
    );
  }

  try {
    const prompt = buildIllustrationPrompt(parsed.data);
    const { bytes, mimeType } = await generateJournalImage({ apiKey, prompt });

    const { path, signedUrl } = await uploadJournalIllustration({
      supabase: auth.ctx.supabase,
      userId: auth.ctx.userId,
      entryId: parsed.data.entryId,
      bytes,
      mimeType,
    });

    const imageMedia = {
      url: signedUrl,
      path,
      stylePreset: parsed.data.stylePreset,
      aspectRatio: parsed.data.aspectRatio,
      createdAt: new Date().toISOString(),
    };

    // Merge into existing ai_media JSONB rather than overwriting audio.
    const { data: existing, error: readErr } = await auth.ctx.supabase
      .from("journal_entries")
      .select("ai_media")
      .eq("id", parsed.data.entryId)
      .eq("user_id", auth.ctx.userId)
      .single();
    if (readErr) {
      return NextResponse.json(
        { error: "ai_persist_failed", detail: readErr.message, imageUrl: signedUrl },
        { status: 502 },
      );
    }

    const prevMedia =
      (existing?.ai_media as Record<string, unknown> | null) ?? {};
    const nextMedia = { ...prevMedia, image: imageMedia };

    const { error: upErr } = await auth.ctx.supabase
      .from("journal_entries")
      .update({ ai_media: nextMedia })
      .eq("id", parsed.data.entryId)
      .eq("user_id", auth.ctx.userId);
    if (upErr) {
      return NextResponse.json(
        { error: "ai_persist_failed", detail: upErr.message, imageUrl: signedUrl },
        { status: 502 },
      );
    }

    return NextResponse.json({ imageUrl: signedUrl, image: imageMedia });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "illustration_failed", detail: msg.slice(0, 500) },
      { status: 502 },
    );
  }
}
