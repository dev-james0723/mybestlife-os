import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import { getLlmResponseLanguageDirective } from "@/lib/ai/llm-response-locale";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import {
  buildWizardSynthesisUserMessage,
  wizardSynthesisSystemInstruction,
} from "@/lib/ai/prompt-wizard-synthesize";
import { PROMPT_TOP_CATEGORIES, type PromptCreatorWizardState } from "@/types/prompt";

export const runtime = "nodejs";

const topCategoryZ = z.enum(
  PROMPT_TOP_CATEGORIES as unknown as [string, ...string[]],
);

const variableRow = z.object({
  name: z.string().max(64),
  label: z.string().max(120).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  required: z.boolean(),
  example: z.string().max(500).nullable().optional(),
});

const synthesizeResult = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(800),
  body: z.string().min(1).max(100_000),
  variables: z.array(variableRow).max(32),
  tags: z.array(z.string().min(1).max(48)).max(16),
  top_category: topCategoryZ,
});

const wizardStateSchema = z.object({
  stepId: z.string(),
  goal: z.string(),
  expertRole: z.string(),
  context: z.string(),
  outputFormat: z.string(),
  toneStyle: z.array(z.string()),
  variables: z
    .array(variableRow)
    .transform((rows) => rows.filter((r) => r.name.trim().length > 0)),
  guardrails: z.string(),
  examples: z.array(
    z.object({
      input: z.string(),
      expectedOutput: z.string(),
    }),
  ),
  draftId: z.string().nullable().optional(),
  synthesizedBody: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
});

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("no_json_object");
    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  }
}

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
  const languageRule = getLlmResponseLanguageDirective(locale);

  const parsedState = wizardStateSchema.safeParse(obj.wizard);
  if (!parsedState.success) {
    return NextResponse.json(
      { error: "invalid_wizard", details: parsedState.error.flatten() },
      { status: 400 },
    );
  }

  const wizard = parsedState.data as unknown as PromptCreatorWizardState;
  if (wizard.goal.trim().length < 3) {
    return NextResponse.json({ error: "goal_too_short" }, { status: 400 });
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "missing_gemini_api_key" }, { status: 500 });
  }

  const userMessage = buildWizardSynthesisUserMessage(wizard, locale);
  const systemInstruction = `${wizardSynthesisSystemInstruction(PROMPT_TOP_CATEGORIES)}

Language (critical): ${languageRule}
The "title" and "description" fields must follow this language. The "body" may be English if the user's goal is English-centric, but must still respect the language rule when the user's goal is clearly in another language.`;

  try {
    const { text } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction,
      userText: userMessage,
    });
    const raw = extractJsonObject(text);
    const out = synthesizeResult.safeParse(raw);
    if (!out.success) {
      return NextResponse.json(
        { error: "invalid_model_json", details: out.error.flatten() },
        { status: 502 },
      );
    }
    return NextResponse.json({ result: out.data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "synthesis_failed", message: msg.slice(0, 2000) },
      { status: 502 },
    );
  }
}
