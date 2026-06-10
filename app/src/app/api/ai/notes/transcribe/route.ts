import { NextResponse } from "next/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  extractFileTextViaGemini,
  GEMINI_INLINE_FILE_MAX_BYTES,
} from "@/lib/knowledge/ai/geminiExtractFileText";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = GEMINI_INLINE_FILE_MAX_BYTES;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!getGeminiServerApiKey()) {
    return NextResponse.json(
      { error: "Gemini is not configured for server transcription." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty audio" }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      {
        error: `Audio exceeds ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)} MB limit`,
      },
      { status: 413 },
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const transcript = await extractFileTextViaGemini({
      bytes,
      mimeType: file.type || "audio/webm",
      fileName: file.name || "meeting-recording.webm",
      mode: "transcribe",
      multilingualSpeech: true,
    });
    return NextResponse.json({ transcript: transcript.trim() });
  } catch (error) {
    console.error(
      "[notes/transcribe]",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: "Transcription failed. Try again or paste the Zoom transcript." },
      { status: 502 },
    );
  }
}
