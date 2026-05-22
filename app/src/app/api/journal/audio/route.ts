import { NextResponse } from "next/server";
import { z } from "zod";

import {
  fetchGeminiStructured,
  getGeminiHabitsProModel,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import {
  JOURNAL_AUDIO_SYSTEM_PROMPT,
  buildAudioScriptUserPrompt,
} from "@/lib/journal/ai-prompts";
import {
  AUDIO_SCRIPT_GEMINI_SCHEMA,
  audioScriptResponseSchema,
} from "@/lib/journal/ai-schemas";
import { synthesizeJournalAudio } from "@/lib/journal/gemini-media";
import { audioRequestSchema } from "@/lib/journal/schema";
import { uploadJournalAudio } from "@/lib/journal/storage";
import { parseBody, requireAuthedContext } from "../_shared";

export const runtime = "nodejs";

const requestSchema = audioRequestSchema.extend({
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
    // Step 1: generate the script + 3 quote lines with the text LLM.
    const { data: rawScript } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiHabitsProModel(),
      systemInstruction: JOURNAL_AUDIO_SYSTEM_PROMPT,
      userText: buildAudioScriptUserPrompt(parsed.data),
      responseSchema: AUDIO_SCRIPT_GEMINI_SCHEMA,
      temperature: 0.6,
      maxOutputTokens: 2048,
    });
    const { script, quotes } = audioScriptResponseSchema.parse(rawScript);

    // Step 2: TTS the script.
    const tts = await synthesizeJournalAudio({
      apiKey,
      text: script,
      voice: parsed.data.voice,
    });

    // Step 3: upload the audio to Storage and grab a signed URL.
    const { path, signedUrl } = await uploadJournalAudio({
      supabase: auth.ctx.supabase,
      userId: auth.ctx.userId,
      entryId: parsed.data.entryId,
      bytes: tts.bytes,
      mimeType: tts.mimeType,
    });

    const audioMedia = {
      url: signedUrl,
      path,
      transcript: script,
      voice: parsed.data.voice,
      speed: parsed.data.speed,
      createdAt: new Date().toISOString(),
    };

    // Step 4: merge into ai_media without clobbering an existing image.
    const { data: existing, error: readErr } = await auth.ctx.supabase
      .from("journal_entries")
      .select("ai_media")
      .eq("id", parsed.data.entryId)
      .eq("user_id", auth.ctx.userId)
      .single();
    if (readErr) {
      return NextResponse.json(
        {
          error: "ai_persist_failed",
          detail: readErr.message,
          audioUrl: signedUrl,
          script,
          quotes,
        },
        { status: 502 },
      );
    }

    const prevMedia =
      (existing?.ai_media as Record<string, unknown> | null) ?? {};
    const nextMedia = { ...prevMedia, audio: audioMedia };

    const { error: upErr } = await auth.ctx.supabase
      .from("journal_entries")
      .update({ ai_media: nextMedia })
      .eq("id", parsed.data.entryId)
      .eq("user_id", auth.ctx.userId);
    if (upErr) {
      return NextResponse.json(
        {
          error: "ai_persist_failed",
          detail: upErr.message,
          audioUrl: signedUrl,
          script,
          quotes,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      audioUrl: signedUrl,
      script,
      quotes,
      audio: audioMedia,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "audio_failed", detail: msg.slice(0, 500) },
      { status: 502 },
    );
  }
}
