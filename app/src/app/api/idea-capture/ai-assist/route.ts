import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { coerceSuggestionPayload } from "@/lib/idea-capture/coerceAiSuggestion";

export const runtime = "nodejs";

const MAX_CONTENT_CHARS = 8000;

function clean(s: string | null | undefined, max = MAX_CONTENT_CHARS): string {
  return (s ?? "").slice(0, max);
}

/**
 * POST `/api/idea-capture/ai-assist`
 *
 * Body: `{ content: string, existingKind?: string }`
 *
 * Returns the same JSON shape as the `idea-ai-assist` Edge Function so the
 * client can stay unchanged. Uses **Gemini** on the Next.js server (same key
 * as voice transcription) so production does not depend on
 * `ANTHROPIC_API_KEY` on Supabase Edge.
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

  let payload: { content?: string; existingKind?: string };
  try {
    payload = (await req.json()) as { content?: string; existingKind?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const content = clean(payload.content).trim();
  const existingKind = clean(payload.existingKind, 20).trim().toLowerCase();

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const systemInstruction = `You analyze a captured idea or note and return structured metadata to help route it.

Return ONLY valid JSON with this exact shape:
{
  "title": string,
  "ai_tags": string[],
  "suggestedDestinations": ("task" | "kb" | "timeline" | "graph")[],
  "suggestedKind": "idea" | "task" | "note" | "goal"
}

Rules:
- title: concise noun phrase, <= 60 chars, no trailing period, no quotes.
- ai_tags: up to 5 lowercase hyphenated tags (e.g. "side-project", "career", "learning"). No leading "#".
- suggestedDestinations: pick any that fit (multiple allowed). Heuristics:
  * "task" — the idea includes an actionable verb or clear next step.
  * "kb" — the idea is a fact, quote, reference, or longer reflection worth archiving.
  * "timeline" — the idea is time-bound or marks a moment.
  * "graph" — the idea names a specific person, organization, or project to track.
- suggestedKind: your best guess. Prefer the existing capture kind unless confidence is high.
- Output JSON only, no fencing, no preamble.`;

  const userText = `Current capture kind (may override if very confident): ${existingKind || "(none)"}

Idea content:
${content}`;

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

    return NextResponse.json(coerceSuggestionPayload(parsed));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[idea-capture/ai-assist]", message);
    return NextResponse.json(
      { error: "AI assist failed. Try again in a moment." },
      { status: 502 },
    );
  }
}
