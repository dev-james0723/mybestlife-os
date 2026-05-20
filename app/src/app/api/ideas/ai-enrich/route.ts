import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { stripHtml } from "@/lib/utils/html";

export const runtime = "nodejs";

const MAX_HTML_CHARS = 24_000;

function coerceEnrichPayload(raw: unknown): { title: string; summary: string } {
  if (!raw || typeof raw !== "object") {
    return { title: "", summary: "" };
  }
  const o = raw as Record<string, unknown>;
  const titleRaw = typeof o.title === "string" ? o.title.trim() : "";
  const title = titleRaw.replace(/\s+/g, " ").replace(/\.+$/u, "").slice(0, 120);
  const summaryRaw = typeof o.summary === "string" ? o.summary.trim() : "";
  const summary = summaryRaw.replace(/\s+/g, " ").slice(0, 2000);
  return { title, summary };
}

/**
 * POST `/api/ideas/ai-enrich`
 *
 * Body: `{ contentHtml: string }`
 *
 * Returns `{ title, summary }` using Gemini. Title and summary use the same
 * language and script as the source note when possible.
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
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Gemini is not configured. Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) on the server.",
      },
      { status: 503 },
    );
  }

  let payload: { contentHtml?: string };
  try {
    payload = (await req.json()) as { contentHtml?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plain = stripHtml((payload.contentHtml ?? "").slice(0, MAX_HTML_CHARS)).trim();
  if (plain.length < 20) {
    return NextResponse.json(
      { error: "contentHtml must yield at least 20 characters of text" },
      { status: 400 },
    );
  }

  const systemInstruction = `You help organize personal ideas captured in a notes app.

Return ONLY valid JSON with this exact shape:
{
  "title": string,
  "summary": string
}

Rules:
- title: one line, specific to this idea, <= 90 characters, no trailing period, no surrounding quotes. Match the dominant language and script of the source (e.g. Cantonese Traditional Chinese stays Cantonese Traditional).
- summary: 2–5 short sentences capturing the gist; same language/script as the source. No markdown, no bullet list syntax, no leading labels like "Summary:".
- Do not invent facts not supported by the text.
- Output JSON only, no code fences, no preamble.`;

  const userText = `Idea content (plain text extracted from rich text):\n${plain}`;

  try {
    const { text } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction,
      userText,
    });

    let parsed: unknown = null;
    const trimmed = text.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        parsed = JSON.parse(trimmed) as unknown;
      } catch {
        parsed = null;
      }
    }

    return NextResponse.json(coerceEnrichPayload(parsed));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ideas/ai-enrich]", message);
    return NextResponse.json(
      { error: "AI enrich failed. Try again in a moment." },
      { status: 502 },
    );
  }
}
