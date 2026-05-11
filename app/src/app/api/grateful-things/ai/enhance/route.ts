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

  const currentCategoryRaw = typeof json.currentCategory === "string" ? json.currentCategory.trim() : "";
  const currentCategory = (GRATITUDE_CATEGORY_VALUES as readonly string[]).includes(currentCategoryRaw)
    ? currentCategoryRaw
    : "";

  const categoryList = GRATITUDE_CATEGORY_VALUES.join("\n");
  const selectionNote = currentCategory
    ? `The user already has this category selected in the form: "${currentCategory}". After you improve the entry, re-check whether that selection still fits the polished text. If it remains a strong fit, return that exact same category string. If the improved gratitude clearly belongs elsewhere, return the single best category from the list instead.`
    : `The user has not chosen a category yet. Pick the single best gratitude category for the improved entry.`;

  const systemInstruction = `You polish short gratitude journal entries for grammar, clarity, and warmth while keeping the author's meaning and voice.
You also pick the single best gratitude category for the entry from this exact list (use the string exactly as written, including & and capitalization):
${categoryList}

${selectionNote}

Respond with valid JSON only: {"enhancedText":"<the improved entry>","category":"<one string from the list above>"}.
Rules:
- Use the same language as the input (do not translate unless the user mixed languages intentionally).
- Preserve first-person tone when present.
- Plain text only in enhancedText: no HTML, no markdown headings, no code fences. Use \\n between paragraphs if needed.
- Prefer one or two short paragraphs. Do not add a title line.
- category must be exactly one of the listed values. If unsure, use "Other".`;

  try {
    const { text: rawJson } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction,
      userText: `Gratitude entry to improve:\n\n${text}${
        currentCategory ? `\n\n(User's current category selection: ${currentCategory})` : ""
      }`,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson) as unknown;
    } catch {
      return NextResponse.json({ error: "Model returned invalid JSON" }, { status: 502 });
    }

    if (!isRecord(parsed) || typeof parsed.enhancedText !== "string") {
      return NextResponse.json({ error: "Model response missing enhancedText" }, { status: 502 });
    }

    const enhancedText = parsed.enhancedText.trim();
    if (!enhancedText) {
      return NextResponse.json({ error: "Model returned empty text" }, { status: 502 });
    }

    let category: string | undefined;
    if (typeof parsed.category === "string") {
      const raw = parsed.category.trim();
      if ((GRATITUDE_CATEGORY_VALUES as readonly string[]).includes(raw)) {
        category = raw;
      }
    }

    return NextResponse.json({ enhancedText, ...(category ? { category } : {}) });
  } catch (e) {
    console.error("[grateful-things/ai/enhance]", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Gemini request failed", detail: detail.slice(0, 800) },
      { status: 502 },
    );
  }
}
