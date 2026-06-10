import { NextResponse } from "next/server";
import { z } from "zod";

import {
  fetchGeminiStructured,
  getGeminiPlannerTextModel,
  getGeminiServerApiKey,
  type GeminiResponseSchema,
} from "@/lib/ai/gemini-text";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildLocalQuickSnapAck,
  type OSBuddyQuickSnapAckContext,
} from "@/lib/os-buddy/os-buddy-quick-snap";

export const runtime = "nodejs";
export const maxDuration = 30;

const QuickSnapAckRequestSchema = z.object({
  locale: z.string().max(16).default("en"),
  destination: z.enum(["idea", "knowledge"]),
  primaryKind: z.enum(["url", "text", "html", "file", "mixed"]),
  previewLabel: z.string().trim().min(1).max(160),
  savedCount: z.number().int().min(0).max(50),
  labels: z.array(z.string().trim().max(160)).max(8).default([]),
});

const QuickSnapAckResponseSchema = z.object({
  message: z.string().trim().min(1).max(180),
  source: z.enum(["ai", "fallback"]),
});

const QUICK_SNAP_ACK_GEMINI_SCHEMA: GeminiResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
  required: ["message"],
};

function fallbackFor(input: OSBuddyQuickSnapAckContext) {
  return {
    message: buildLocalQuickSnapAck(input),
    source: "fallback" as const,
  };
}

function buildSystemInstruction(locale: string) {
  const languageRule =
    locale === "zh-TW" || locale.startsWith("zh")
      ? "Write natural Traditional Chinese with a light Cantonese-friendly rhythm when appropriate."
      : "Write natural English.";

  return `You are OS Buddy, a tiny pixel companion in a personal Life OS app.

${languageRule}

Return ONLY JSON matching the schema.
message: one short speech-bubble line. English: 7-22 words. Chinese: 8-42 characters.
Say that you captured/saved the item. Mention the source type or topic only if it is clear from the provided labels.
Do not invent authors, article claims, or file contents.
Do not include markdown, bullets, emojis, or code fences.
Sound warm, quick, and useful.`;
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

  const parsed = QuickSnapAckRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const fallback = fallbackFor(parsed.data);
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) return NextResponse.json(fallback);

  try {
    const { data } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiPlannerTextModel(),
      systemInstruction: buildSystemInstruction(parsed.data.locale),
      userText: JSON.stringify({
        destination:
          parsed.data.destination === "idea" ? "Idea Capture" : "Knowledge Base",
        primaryKind: parsed.data.primaryKind,
        previewLabel: parsed.data.previewLabel,
        savedCount: parsed.data.savedCount,
        labels: parsed.data.labels,
      }),
      responseSchema: QUICK_SNAP_ACK_GEMINI_SCHEMA,
      temperature: 0.72,
      maxOutputTokens: 256,
      timeoutMs: 10_000,
    });

    const shaped = QuickSnapAckResponseSchema.safeParse({
      ...(typeof data === "object" && data ? data : {}),
      source: "ai",
    });
    if (!shaped.success) return NextResponse.json(fallback);

    return NextResponse.json(shaped.data);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[os-buddy/quick-snap-ack] Gemini failed",
        error instanceof Error ? error.message : String(error),
      );
    }
    return NextResponse.json(fallback);
  }
}
