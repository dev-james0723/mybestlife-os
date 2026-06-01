import { NextResponse } from "next/server";
import { z } from "zod";

import { synthesizeAppSpeech } from "@/lib/ai/app-tts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 180;

const requestSchema = z.object({
  text: z.string().trim().min(1).max(600).optional(),
  language: z.enum(["en", "zh-Hant", "auto"]).optional().default("auto"),
});

function isMissingTtsSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    (lower.includes("user_tts_preferences") ||
      lower.includes("user_tts_voice_profiles")) &&
    (lower.includes("schema cache") ||
      lower.includes("relation") ||
      lower.includes("does not exist") ||
      lower.includes("could not find"))
  );
}

const TTS_SCHEMA_MISSING_DETAIL =
  "Missing tts tables. Apply the VoxCPM TTS migration in app/supabase/migrations and reload Settings.";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_preview_request", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const text =
    parsed.data.text ||
    "This is your app-wide voice preview. It should sound calm, clear, and personal.";

  try {
    const audio = await synthesizeAppSpeech({
      supabase,
      userId: user.id,
      text,
      language: parsed.data.language,
      voiceGender: "female",
      format: "single_host",
      styleInstruction:
        "Brief app voice preview, calm and clear, warm but not motivational",
    });
    return NextResponse.json({
      audioDataUrl: `data:${audio.mimeType};base64,${audio.audioBytes.toString("base64")}`,
      provider: audio.provider,
      voiceName: audio.voiceName,
      mimeType: audio.mimeType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isMissingTtsSchemaError(message)) {
      return NextResponse.json(
        {
          error: "tts_schema_missing",
          detail: TTS_SCHEMA_MISSING_DETAIL,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "tts_preview_failed", detail: message.slice(0, 300) },
      { status: 502 },
    );
  }
}
