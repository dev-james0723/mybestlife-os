import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  formatGeminiBillingUserMessage,
  isGeminiBillingErrorMessage,
  parseGeminiErrorMessage,
} from "@/lib/ai/gemini-errors";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import {
  clampIdeaSummary,
  clampIdeaTitle,
  fallbackIdeaTitleFromPlain,
  parseGeminiEnrichJson,
} from "@/lib/ideas/clamp-idea-title";
import { isSuggestionTooSimilar } from "@/lib/ideas/idea-suggestion-guard";
import { stripHtml } from "@/lib/utils/html";

export const runtime = "nodejs";

const MAX_HTML_CHARS = 24_000;

function firstParagraphSummary(plain: string, max = 480): string {
  const compact = plain.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const sentence = compact.split(/[。！？.!?\n]/u)[0]?.trim() || compact;
  return clampIdeaSummary(sentence, max);
}

function buildEnrichResponse(
  plain: string,
  titleRaw: string,
  summaryRaw: string,
): {
  title: string;
  summary: string;
  titleSource: "gemini" | "fallback";
  summarySource: "gemini" | "fallback";
} {
  const title = clampIdeaTitle(titleRaw) || fallbackIdeaTitleFromPlain(plain);
  const summaryCandidate = clampIdeaSummary(summaryRaw);
  const summary =
    summaryCandidate && !isSuggestionTooSimilar(summaryCandidate, plain, 0.72)
      ? summaryCandidate
      : firstParagraphSummary(plain);

  return {
    title,
    summary,
    titleSource: titleRaw.trim() && clampIdeaTitle(titleRaw) ? "gemini" : "fallback",
    summarySource:
      summaryCandidate && !isSuggestionTooSimilar(summaryCandidate, plain, 0.72)
        ? "gemini"
        : "fallback",
  };
}

/**
 * POST `/api/ideas/ai-enrich`
 *
 * Body: `{ contentHtml: string }`
 *
 * Returns `{ title, summary }`. Both are Gemini-generated when configured.
 */
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = getGeminiServerApiKey();

  let payload: { contentHtml?: string };
  try {
    payload = (await req.json()) as { contentHtml?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plain = stripHtml((payload.contentHtml ?? "").slice(0, MAX_HTML_CHARS)).trim();
  if (plain.length < 8) {
    return NextResponse.json(
      { error: "contentHtml must yield at least 8 characters of text" },
      { status: 400 },
    );
  }

  const systemInstruction = `You analyze a captured personal idea and return structured metadata. You GENERALIZE — never copy the user's first sentence verbatim into title or summary.

Return ONLY valid JSON with this exact shape:
{
  "title": string,
  "summary": string
}

Rules:
- LANGUAGE: match the idea's dominant script (Traditional Chinese / Cantonese stays natural Traditional; English stays English).
- title: one generalized noun phrase or short label for the idea — NOT the opening sentence. No trailing punctuation, no quotes. Max 10 Chinese characters OR 8 English words.
  GOOD: "晚餐聚會", "商標註冊", "Dinner plans". BAD: "hi I want to go to dinner", "簡單嚟講，同一個名係可".
- summary: 2–4 sentences that synthesize what the idea is about, why it matters, or what the user is exploring. Add abstraction — do NOT paste or lightly rephrase the source text. Max 120 Chinese characters OR 80 English words.
- Do not invent facts not supported by the text.
- Output JSON only, no code fences, no preamble.`;

  const userText = `Idea content (plain text extracted from rich text):\n${plain}`;

  if (!apiKey) {
    console.warn("[ideas/ai-enrich] GEMINI_API_KEY missing — using fallback");
    const fallback = buildEnrichResponse(plain, "", "");
    return NextResponse.json({ ...fallback, warning: "gemini_not_configured" });
  }

  try {
    const { text } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction,
      userText,
    });

    const { title: titleRaw, summary: summaryRaw } = parseGeminiEnrichJson(text);
    const result = buildEnrichResponse(plain, titleRaw, summaryRaw);
    if (result.titleSource === "fallback" || result.summarySource === "fallback") {
      console.warn("[ideas/ai-enrich] Gemini returned partial output — using fallback fields");
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ideas/ai-enrich]", message);
    const fallback = buildEnrichResponse(plain, "", "");
    const fail = parseGeminiErrorMessage(message);
    const billing = isGeminiBillingErrorMessage(message);
    return NextResponse.json({
      ...fallback,
      warning: billing ? "gemini_billing" : "gemini_failed",
      geminiMessage: billing ? formatGeminiBillingUserMessage(fail) : undefined,
    });
  }
}
