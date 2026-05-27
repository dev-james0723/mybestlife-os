import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchGeminiPlannerJsonText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { parseAppLocale, type AppLocale } from "@/lib/i18n/app-locale";
import {
  buildJournalEntryUserText,
  localeToGeminiLanguage,
  type JournalAiReflection,
} from "@/lib/journal/journal-ai-helpers";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function parseReflection(parsed: unknown): JournalAiReflection | null {
  if (!isRecord(parsed)) return null;
  if (typeof parsed.journalEntry !== "string" || !parsed.journalEntry.trim()) return null;
  const emotionalRead = parseStringArray(parsed.emotionalRead);
  if (!isRecord(parsed.suggestions)) return null;
  const coping = typeof parsed.suggestions.coping === "string" ? parsed.suggestions.coping : "";
  const practical = typeof parsed.suggestions.practical === "string" ? parsed.suggestions.practical : "";
  const reframeQuestions = parseStringArray(parsed.suggestions.reframeQuestions);
  if (typeof parsed.earnedAppreciation !== "string") return null;
  const themes = parseStringArray(parsed.themes);
  return {
    journalEntry: parsed.journalEntry.trim(),
    emotionalRead,
    suggestions: { coping, practical, reframeQuestions },
    earnedAppreciation: parsed.earnedAppreciation.trim(),
    themes,
    likelyPattern: typeof parsed.likelyPattern === "string" ? parsed.likelyPattern.trim() : undefined,
  };
}

function hasJournalInput(body: Record<string, unknown>): boolean {
  const textFields = [
    body.topic,
    body.primaryEmotion,
    body.secondaryEmotion,
    body.target,
    body.selfStory,
    body.nextTinyStep,
    body.appreciation,
    body.quadrant,
  ];
  if (textFields.some((v) => typeof v === "string" && v.trim().length > 0)) return true;
  if (Array.isArray(body.bullets) && body.bullets.some((b) => typeof b === "string" && b.trim())) return true;
  if (Array.isArray(body.needs) && body.needs.some((n) => typeof n === "string" && n.trim())) return true;
  if (typeof body.intensity === "number" && body.intensity >= 1) return true;
  if (Array.isArray(body.pastEntriesContext) && body.pastEntriesContext.length > 0) return true;
  return false;
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

  const locale: AppLocale = parseAppLocale(json.locale);
  if (!hasJournalInput(json)) {
    return NextResponse.json({ error: "Entry data is required" }, { status: 400 });
  }

  const bullets = parseStringArray(json.bullets);
  const needs = parseStringArray(json.needs);
  const intensity =
    typeof json.intensity === "number" && json.intensity >= 1 && json.intensity <= 10
      ? json.intensity
      : null;

  const userTextParts = [
    `Respond in ${localeToGeminiLanguage(locale)} for all user-facing strings.`,
    buildJournalEntryUserText({
      topic: typeof json.topic === "string" ? json.topic : null,
      quadrant: typeof json.quadrant === "string" ? json.quadrant : null,
      primaryEmotion: typeof json.primaryEmotion === "string" ? json.primaryEmotion : null,
      secondaryEmotion: typeof json.secondaryEmotion === "string" ? json.secondaryEmotion : null,
      intensity,
      target: typeof json.target === "string" ? json.target : null,
      bullets,
      selfStory: typeof json.selfStory === "string" ? json.selfStory : null,
      needs,
      nextTinyStep: typeof json.nextTinyStep === "string" ? json.nextTinyStep : null,
      appreciation: typeof json.appreciation === "string" ? json.appreciation : null,
      topicExtras: isRecord(json.topicExtras) ? json.topicExtras : undefined,
      contextFactors: isRecord(json.contextFactors) ? json.contextFactors : undefined,
    }),
  ];

  if (Array.isArray(json.pastEntriesContext) && json.pastEntriesContext.length > 0) {
    userTextParts.push(
      `Recent past entries (for pattern context only, do not invent facts):\n${JSON.stringify(json.pastEntriesContext).slice(0, 6000)}`,
    );
  }

  const systemInstruction = `You are a private journal companion AI inside a personal life OS.

Your job is to help the user process emotions and experiences based only on the provided entry data.

Return valid JSON only.

Rules:
- Use the requested locale for all user-facing text.
- Never invent facts.
- Never give medical advice, diagnosis, or clinical labels.
- Be specific, grounded, and human.
- Focus on emotional regulation, needs awareness, and tiny actionable steps.
- Use humble language for inferences: "it may be", "it sounds like", "one possible pattern is".
- Do not use generic therapy-bot language.
- Do not flatter. Appreciation must be earned and evidence-based.
- If the entry is too thin, say less and avoid over-interpreting.
- If self-harm or crisis language appears, switch to a supportive safety-oriented response and encourage reaching out to trusted people or local emergency services.

Return this exact JSON shape:
{
  "journalEntry": "4-8 sentence narrative summary",
  "emotionalRead": ["3-5 specific insights"],
  "suggestions": {
    "coping": "2-3 sentence immediate regulation strategy",
    "practical": "2-3 sentence concrete next step",
    "reframeQuestions": ["1-2 thoughtful questions"]
  },
  "earnedAppreciation": "2-3 sentence specific appreciation",
  "themes": ["short theme tags"],
  "likelyPattern": "optional short pattern hypothesis"
}`;

  try {
    const { text: rawJson, modelUsed } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction,
      userText: userTextParts.join("\n\n"),
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson) as unknown;
    } catch {
      return NextResponse.json({ error: "Model returned invalid JSON" }, { status: 502 });
    }

    const reflection = parseReflection(parsed);
    if (!reflection) {
      return NextResponse.json({ error: "Model response missing required fields" }, { status: 502 });
    }

    return NextResponse.json({ ...reflection, modelUsed });
  } catch (e) {
    console.error("[journal/ai/summary]", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Gemini request failed", detail: detail.slice(0, 800) },
      { status: 502 },
    );
  }
}
