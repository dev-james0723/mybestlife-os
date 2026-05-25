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
import { FolderAutofillGeminiSchema } from "@/lib/ai/schemas/ai-knowledge/folder-autofill";

export const runtime = "nodejs";

const promptInput = z.object({
  title: z.string().max(200),
  description: z.string().max(800).optional().default(""),
  top_category: z.string().max(64).optional().default(""),
  tags: z.array(z.string().max(48)).max(24).optional().default([]),
});

const resultSchema = z.object({
  name: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  icon: z.string().min(1).max(16),
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
  const locale = parseAppLocale(obj.locale);
  const parsedPrompts = z
    .array(promptInput)
    .min(1)
    .max(50)
    .safeParse(obj.prompts);
  if (!parsedPrompts.success) {
    return NextResponse.json(
      { error: "invalid_prompts", details: parsedPrompts.error.flatten() },
      { status: 400 },
    );
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_gemini_api_key" },
      { status: 503 },
    );
  }

  const languageRule = getLlmResponseLanguageDirective(locale);

  const systemInstruction = `You name a folder that groups several AI prompts a user has collected.
Infer the shared theme only from the listed prompts.

Rules:
- name: a short, evocative folder title (max ~6 words). No quotes or trailing punctuation.
- summary: exactly one sentence describing what the folder collects or when to use it.
- icon: a single emoji that captures the shared theme.

Language (critical): ${languageRule}
The "name" and "summary" MUST follow this language rule. The "icon" is an emoji (language-neutral).`;

  const promptLines = parsedPrompts.data
    .map((p, i) => {
      const meta = [p.top_category, ...(p.tags ?? [])]
        .filter(Boolean)
        .join(", ");
      const desc = p.description ? ` — ${p.description}` : "";
      const metaSuffix = meta ? ` [${meta}]` : "";
      return `${i + 1}. ${p.title}${desc}${metaSuffix}`;
    })
    .join("\n");

  const userText = `Prompts in this folder:\n---\n${promptLines}\n---`;

  try {
    const { data: raw } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction,
      userText,
      responseSchema: FolderAutofillGeminiSchema,
      temperature: 0.4,
      maxOutputTokens: 512,
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
      name: out.name.trim(),
      summary: out.summary.trim(),
      icon: out.icon.trim(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "autofill_failed", message: msg.slice(0, 2000) },
      { status: 502 },
    );
  }
}
