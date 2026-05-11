import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import { getLlmResponseLanguageDirective } from "@/lib/ai/llm-response-locale";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { PromptMetadataGeminiSchema } from "@/lib/ai/schemas/ai-knowledge/prompt-metadata";
import { PROMPT_TOP_CATEGORIES, type PromptTopCategory } from "@/types/prompt";

export const runtime = "nodejs";

const topCategoryZ = z.enum(
  PROMPT_TOP_CATEGORIES as unknown as [string, ...string[]],
);

const resultSchema = z.object({
  tags: z.array(z.string().min(1).max(48)).max(12),
  top_category: topCategoryZ,
  short_description: z.string().min(1).max(800),
  suggested_title: z.string().min(1).max(200).optional(),
});

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const obj = bodyJson as Record<string, unknown>;
  const body =
    typeof obj.body === "string" ? obj.body.trim().slice(0, 24_000) : "";
  const locale = parseAppLocale(obj.locale);

  if (body.length < 20) {
    return NextResponse.json({ error: "body_too_short" }, { status: 400 });
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "missing_gemini_api_key" }, { status: 503 });
  }

  const languageRule = getLlmResponseLanguageDirective(locale);
  const categoriesList = PROMPT_TOP_CATEGORIES.join(", ");

  const systemInstruction = `You classify a user-authored AI prompt body for a personal prompt library.
Infer metadata only from the given prompt text. Be concise.

Rules:
- tags: lowercase, hyphen or ASCII words, no hashtags, 2–10 items, mix scope (domain + task).
- top_category: exactly one value from this closed set: ${categoriesList}
- short_description: follow language rule below; max ~280 characters; describe purpose/outcome, not the whole prompt.
- suggested_title: optional; short label for the library card; follow language rule.

Language (critical): ${languageRule}
The short_description and suggested_title MUST follow this language rule.`;

  const userText = `Prompt body:\n---\n${body}\n---`;

  try {
    const { data: raw } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction,
      userText,
      responseSchema: PromptMetadataGeminiSchema,
      temperature: 0.25,
      maxOutputTokens: 1024,
      timeoutMs: 45_000,
    });

    const parsed = resultSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_model_json", details: parsed.error.flatten() },
        { status: 502 },
      );
    }

    const out = parsed.data;
    return NextResponse.json({
      tags: out.tags.map((t) => t.toLowerCase()),
      top_category: out.top_category as PromptTopCategory,
      short_description: out.short_description.trim(),
      suggested_title: out.suggested_title?.trim() || undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "metadata_failed", message: msg.slice(0, 2000) },
      { status: 502 },
    );
  }
}
