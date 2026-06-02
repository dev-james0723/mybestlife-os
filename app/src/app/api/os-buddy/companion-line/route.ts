import { NextResponse } from "next/server";

import { fetchGeminiStructured, getGeminiPlannerTextModel, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildLocalOSBuddyCompanionResponse,
  normalizeOSBuddyCompanionResponse,
  type OSBuddyCompanionResponse,
} from "@/lib/os-buddy/os-buddy-companion";
import {
  OS_BUDDY_COMPANION_GEMINI_SCHEMA,
  OSBuddyCompanionRequestSchema,
  OSBuddyCompanionResponseSchema,
} from "@/lib/os-buddy/os-buddy-companion-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

function buildSystemInstruction(locale: string) {
  const languageRule = locale === "zh-TW" || locale.startsWith("zh")
    ? "Write natural Traditional Chinese."
    : "Write natural English.";

  return `You are the OS Buddy pet inside a personal Life OS app. You are a tiny pixel companion: warm, playful, emotionally present, and useful without sounding formal.

${languageRule}

Rules:
- Return ONLY JSON matching the response schema.
- message: one short speech-bubble line. English: 6-24 words. Chinese: 8-42 characters.
- Use only the compact context provided. Never invent tasks, weather, quotes, feelings, or schedule facts.
- Sound like a companion pet, not a dashboard or corporate assistant.
- If kind is reminder, be gentle and concrete.
- If kind is schedule, mention the shape of today or a useful free window.
- If kind is compliment, base it on the compact journal/idea/gratitude snippets without quoting sensitive details too heavily.
- Do not give medical, legal, financial, or safety-critical instructions.
- Do not include markdown, bullets, emojis, or code fences.
- Omit cta unless kind is game.`;
}

function buildUserText(input: ReturnType<typeof OSBuddyCompanionRequestSchema.parse>) {
  return JSON.stringify({
    selectedKind: input.kind,
    buddyName: input.context.buddyName,
    today: input.context.today,
    schedule: input.context.schedule,
    weather: input.context.weather,
    quoteCount: input.context.quotes.length,
    quoteSamples: input.context.quotes.slice(0, 4),
    memories: input.context.memories,
  });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = OSBuddyCompanionRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const fallback = buildLocalOSBuddyCompanionResponse({
    kind: parsed.data.kind,
    context: parsed.data.context,
    source: "fallback",
  });

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json(fallback);
  }

  try {
    const { data } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiPlannerTextModel(),
      systemInstruction: buildSystemInstruction(parsed.data.context.locale),
      userText: buildUserText(parsed.data),
      responseSchema: OS_BUDDY_COMPANION_GEMINI_SCHEMA,
      temperature: 0.65,
      maxOutputTokens: 512,
      timeoutMs: 12_000,
    });

    const shaped = OSBuddyCompanionResponseSchema.safeParse({
      ...(typeof data === "object" && data ? data : {}),
      source: "ai",
    });

    if (!shaped.success) {
      return NextResponse.json(fallback);
    }

    const response: OSBuddyCompanionResponse = normalizeOSBuddyCompanionResponse(
      shaped.data,
      fallback,
    );

    return NextResponse.json(response);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[os-buddy/companion-line] Gemini failed",
        error instanceof Error ? error.message : String(error),
      );
    }
    return NextResponse.json(fallback);
  }
}
