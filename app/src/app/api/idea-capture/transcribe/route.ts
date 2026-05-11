import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { extractFileTextViaGemini } from "@/lib/knowledge/ai/geminiExtractFileText";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";

export const runtime = "nodejs";

/** One segment or short take — keep under Gemini inline limit. */
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getGeminiServerApiKey()) {
    return NextResponse.json(
      {
        error:
          "Gemini is not configured. Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) on the server.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
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
      { error: `Audio exceeds ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)} MB limit` },
      { status: 413 },
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const transcript = await extractFileTextViaGemini({
      bytes,
      mimeType: file.type || "audio/webm",
      fileName: file.name || "recording.webm",
      mode: "transcribe",
      multilingualSpeech: true,
    });
    return NextResponse.json({ transcript: transcript.trim() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[idea-capture/transcribe]", message);
    return NextResponse.json(
      { error: "Transcription failed. Try again or speak a little longer." },
      { status: 502 },
    );
  }
}
