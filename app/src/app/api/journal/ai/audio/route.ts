import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchGeminiPlannerJsonText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { parseAppLocale, type AppLocale } from "@/lib/i18n/app-locale";
import {
  audioMimeToExtension,
  isJournalTtsConfigured,
  synthesizeJournalSpeech,
  type JournalTtsVoice,
} from "@/lib/ai/tts";
import {
  buildJournalEntryUserText,
  localeToGeminiLanguage,
} from "@/lib/journal/journal-ai-helpers";
import {
  JOURNAL_MEDIA_BUCKET,
  journalAudioPath,
  journalMediaPublicUrl,
} from "@/lib/journal/journal-media-storage";

export const runtime = "nodejs";
export const maxDuration = 180;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function parseVoice(v: unknown): JournalTtsVoice {
  if (v === "female") return "female";
  return "male";
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isJournalTtsConfigured()) {
    return NextResponse.json(
      {
        error: "Journal audio is not configured. Set VOXCPM_BASE_URL.",
      },
      { status: 503 },
    );
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Gemini is not configured. Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) on the server.",
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

  const locale: AppLocale = parseAppLocale(json.locale);
  const voice = parseVoice(json.voice);

  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .select("id, user_id")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (entryError) {
    console.error("[journal/ai/audio] entry_lookup", entryError);
    return NextResponse.json({ error: "Could not load entry" }, { status: 500 });
  }
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

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
    selfStory: typeof json.selfStory === "string" ? json.selfStory : null,
    needs,
    nextTinyStep: typeof json.nextTinyStep === "string" ? json.nextTinyStep : null,
    aiSummary: typeof json.aiSummary === "string" ? json.aiSummary : null,
  });

  const systemInstruction = `You are a journal audio companion inside a personal life OS.

Generate a natural, conversational voice-note script based only on the provided journal entry.

Return valid JSON only.

Tone:
- Warm, calm, direct
- Human, not therapy-bot
- No hype, no clichés, no fake positivity
- No "as an AI"
- No diagnosis or medical advice

Length:
- 300-420 words
- About 2 minutes at normal speaking speed

Must include:
- The primary emotion
- Secondary emotion if provided
- At least two concrete event details from bullets
- The user's needs
- The next tiny step
- One value or goal link
- Exactly two suggestions:
  1. one inner suggestion
  2. one outer suggestion
- Exactly one earned appreciation
- Exactly three original quote lines, each 8-16 words

Structure:
1. Mirror
2. Integration
3. Reframe
4. Two suggestions
5. Earned appreciation
6. Close with exactly two reflective questions

Rules:
- Do not simply paraphrase the entry.
- Max 20% should repeat user facts.
- Add insight by connecting emotion + self-story + needs + next step.
- Use humble inference language.
- If the entry is thin, avoid over-interpreting.
- If self-harm or crisis language appears, switch to a supportive safety-oriented response and encourage reaching out to trusted people or local emergency services.

Return this exact JSON:
{
  "script": "full spoken script",
  "quotes": ["quote 1", "quote 2", "quote 3"]
}`;

  let script = "";
  let quotes: string[] = [];
  let modelUsed: string | undefined;

  try {
    const { text: rawJson, modelUsed: model } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction,
      userText: `Respond in ${localeToGeminiLanguage(locale)} for the spoken script and quote lines.\n\n${entryContext}`,
    });
    modelUsed = model;

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson) as unknown;
    } catch {
      return NextResponse.json({ error: "Model returned invalid JSON" }, { status: 502 });
    }

    if (!isRecord(parsed) || typeof parsed.script !== "string" || !parsed.script.trim()) {
      return NextResponse.json({ error: "Model response missing script" }, { status: 502 });
    }
    script = parsed.script.trim();
    quotes = parseStringArray(parsed.quotes).slice(0, 3);
  } catch (e) {
    console.error("[journal/ai/audio] script", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Gemini script request failed", detail: detail.slice(0, 800) },
      { status: 502 },
    );
  }

  let audioBytes: Buffer;
  let mimeType: string;
  let voiceUsed: string | undefined;

  try {
    const ttsOut = await synthesizeJournalSpeech({
      text: script,
      locale,
      voice,
      supabase,
      userId: user.id,
      speed: typeof json.speed === "number" ? json.speed : undefined,
    });
    audioBytes = ttsOut.audioBytes;
    mimeType = ttsOut.mimeType;
    voiceUsed = ttsOut.voiceUsed;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[journal/ai/audio] tts", msg);
    return NextResponse.json(
      { error: "Audio synthesis failed", detail: msg.slice(0, 300) },
      { status: 503 },
    );
  }

  const ext = audioMimeToExtension(mimeType);
  const storagePath = journalAudioPath(user.id, entryId, ext);

  const { error: uploadError } = await supabase.storage
    .from(JOURNAL_MEDIA_BUCKET)
    .upload(storagePath, audioBytes, { contentType: mimeType, upsert: true });

  if (uploadError) {
    console.error("[journal/ai/audio] storage", uploadError);
    return NextResponse.json({ error: "Storage upload failed" }, { status: 502 });
  }

  const audioUrl = journalMediaPublicUrl(supabase, storagePath);

  const { error: updateError } = await supabase
    .from("journal_entries")
    .update({
      ai_audio_url: audioUrl,
      ai_audio_script: script,
      ai_audio_quotes: quotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[journal/ai/audio] db_update", updateError);
    return NextResponse.json({ error: "Could not save audio metadata" }, { status: 502 });
  }

  return NextResponse.json({
    audioUrl,
    script,
    quotes,
    modelUsed,
    voiceUsed,
  });
}
