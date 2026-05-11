import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchGeminiPlannerJsonText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { GRATITUDE_CATEGORY_VALUES } from "@/lib/i18n/grateful-things-ui";

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
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

  const text = typeof json.text === "string" ? json.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > 12_000) {
    return NextResponse.json({ error: "text is too long" }, { status: 400 });
  }

  const categoryList = GRATITUDE_CATEGORY_VALUES.join("\n");
  const systemInstruction = `You assign exactly one gratitude journal category from this list (use the string exactly as written, including & and capitalization):
${categoryList}

Respond with valid JSON only: {"category":"<one string from the list>"}.
Rules:
- category must be exactly one of the listed values. If unsure, use "Other".
- Base the choice only on what the writer is grateful for; ignore spelling and grammar.`;

  try {
    const { text: rawJson } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction,
      userText: `Gratitude entry to categorize:\n\n${text}`,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson) as unknown;
    } catch {
      return NextResponse.json({ error: "Model returned invalid JSON" }, { status: 502 });
    }

    if (!isRecord(parsed) || typeof parsed.category !== "string") {
      return NextResponse.json({ error: "Model response missing category" }, { status: 502 });
    }

    const raw = parsed.category.trim();
    if (!(GRATITUDE_CATEGORY_VALUES as readonly string[]).includes(raw)) {
      return NextResponse.json({ category: "Other" });
    }

    return NextResponse.json({ category: raw });
  } catch (e) {
    console.error("[grateful-things/ai/classify-category]", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Gemini request failed", detail: detail.slice(0, 800) },
      { status: 502 },
    );
  }
}
