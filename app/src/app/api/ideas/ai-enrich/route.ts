import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import {
  clampIdeaTitle,
  fallbackIdeaTitleFromPlain,
  parseGeminiTitleJson,
} from "@/lib/ideas/clamp-idea-title";
import { ideaOverviewFromContent } from "@/lib/ideas/idea-overview";
import { stripHtml } from "@/lib/utils/html";

export const runtime = "nodejs";

const MAX_HTML_CHARS = 24_000;

function buildEnrichResponse(contentHtml: string, plain: string, titleRaw: string): {
  title: string;
  summary: string;
  titleSource: "gemini" | "fallback";
} {
  const overview = ideaOverviewFromContent(contentHtml, 2000);
  const title = clampIdeaTitle(titleRaw) || fallbackIdeaTitleFromPlain(plain);
  return {
    title,
    summary: overview,
    titleSource: titleRaw.trim() && clampIdeaTitle(titleRaw) ? "gemini" : "fallback",
  };
}

/**
 * POST `/api/ideas/ai-enrich`
 *
 * Body: `{ contentHtml: string }`
 *
 * Returns `{ title, summary }`. Title is Gemini-generated (length-clamped).
 * Summary is the user's plain-text content (overview), not an AI rewrite.
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

  const systemInstruction = `You help organize personal ideas captured in a notes app.

Return ONLY valid JSON with this exact shape:
{
  "title": string
}

Rules:
- title: one line, specific to this idea, no trailing period, no surrounding quotes.
- Match the dominant language and script of the source (e.g. Cantonese Traditional Chinese stays Cantonese Traditional).
- Length: at most 10 Chinese characters OR at most 8 English letters (whichever script dominates).
- Do not invent facts not supported by the text.
- Output JSON only, no code fences, no preamble.`;

  const userText = `Idea content (plain text extracted from rich text):\n${plain}`;
  const contentHtml = payload.contentHtml ?? "";

  if (!apiKey) {
    console.warn("[ideas/ai-enrich] GEMINI_API_KEY missing — using fallback title");
    const fallback = buildEnrichResponse(contentHtml, plain, "");
    return NextResponse.json({ ...fallback, warning: "gemini_not_configured" });
  }

  try {
    const { text } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction,
      userText,
    });

    const titleRaw = parseGeminiTitleJson(text);
    const result = buildEnrichResponse(contentHtml, plain, titleRaw);
    if (result.titleSource === "fallback") {
      console.warn("[ideas/ai-enrich] Gemini returned empty/unparseable title — using fallback");
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ideas/ai-enrich]", message);
    const fallback = buildEnrichResponse(contentHtml, plain, "");
    return NextResponse.json({ ...fallback, warning: "gemini_failed" });
  }
}
