import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import { getLlmResponseLanguageDirective } from "@/lib/ai/llm-response-locale";
import {
  fetchGeminiChatText,
  getGeminiPlannerTextModel,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import {
  effectiveVariableSpecs,
  interpolatePromptBody,
  validateVariableValues,
} from "@/lib/ai/interpolate-prompt-body";
import type { PromptVariableJson } from "@/types/database";

export const runtime = "nodejs";

const MAX_SNIPPET = 4000;
const MAX_BODY_FETCH = 120_000;

const bodySchema = z
  .object({
    locale: z.string().optional(),
    libraryPromptId: z.string().uuid().optional(),
    customPromptId: z.string().uuid().optional(),
    variables: z.record(z.string(), z.string()).optional().default({}),
  })
  .refine(
    (b) =>
      (b.libraryPromptId && !b.customPromptId) ||
      (!b.libraryPromptId && b.customPromptId),
    { message: "Exactly one of libraryPromptId or customPromptId is required" },
  );

type LibraryRow = {
  id: string;
  body: string;
  variables: PromptVariableJson[];
};

type CustomRow = {
  id: string;
  user_id: string;
  body: string;
  variables: PromptVariableJson[];
};

function toSpecs(rows: PromptVariableJson[]) {
  return rows.map((r) => ({
    name: r.name,
    label: r.label ?? null,
    description: r.description ?? null,
    required: r.required,
    example: r.example ?? null,
  }));
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { libraryPromptId, customPromptId, variables, locale: localeRaw } =
    parsed.data;
  const locale = parseAppLocale(localeRaw);
  const languageRule = getLlmResponseLanguageDirective(locale);

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_gemini_api_key" },
      { status: 500 },
    );
  }

  let body: string;
  let specs: ReturnType<typeof effectiveVariableSpecs>;
  let libId: string | null = null;
  let custId: string | null = null;

  if (libraryPromptId) {
    const { data, error } = await supabase
      .from("ai_prompt_library")
      .select("id, body, variables")
      .eq("id", libraryPromptId)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }
    const row = data as LibraryRow;
    if (row.body.length > MAX_BODY_FETCH) {
      return NextResponse.json({ error: "Prompt body too large" }, { status: 400 });
    }
    body = row.body;
    specs = effectiveVariableSpecs(toSpecs(row.variables ?? []), body);
    libId = row.id;
  } else {
    const { data, error } = await supabase
      .from("ai_user_prompts")
      .select("id, user_id, body, variables")
      .eq("id", customPromptId!)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }
    const row = data as CustomRow;
    if (row.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (row.body.length > MAX_BODY_FETCH) {
      return NextResponse.json({ error: "Prompt body too large" }, { status: 400 });
    }
    body = row.body;
    specs = effectiveVariableSpecs(toSpecs(row.variables ?? []), body);
    custId = row.id;
  }

  const validation = validateVariableValues(specs, variables);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "missing_variables", missing: validation.missing },
      { status: 400 },
    );
  }

  const interpolated = interpolatePromptBody(body, variables);

  const { data: runRow, error: insertErr } = await supabase
    .from("ai_prompt_runs")
    .insert({
      library_prompt_id: libId,
      custom_prompt_id: custId,
      provider: "gemini",
      model: getGeminiPlannerTextModel(),
      variables,
      status: "running",
      result_snippet: null,
      error_message: null,
    })
    .select("id")
    .single();

  if (insertErr || !runRow) {
    return NextResponse.json(
      { error: "run_insert_failed", details: insertErr?.message },
      { status: 500 },
    );
  }

  const runId = (runRow as { id: string }).id;

  const systemInstruction = `You are a capable assistant inside a personal productivity app.

Language (critical): ${languageRule}
Follow the user's instructions in the prompt below precisely. If the prompt asks for a specific format, honor it. Use Markdown when it improves readability unless the prompt forbids it.`;

  const userMessage = interpolated;

  try {
    const { text, modelUsed } = await fetchGeminiChatText({
      apiKey,
      systemInstruction,
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      temperature: 0.45,
      maxOutputTokens: 8192,
    });

    const snippet = text.slice(0, MAX_SNIPPET);
    const completedAt = new Date().toISOString();

    const { error: upErr } = await supabase
      .from("ai_prompt_runs")
      .update({
        status: "succeeded",
        model: modelUsed,
        result_snippet: snippet,
        error_message: null,
        completed_at: completedAt,
      })
      .eq("id", runId)
      .eq("user_id", user.id);

    if (upErr) {
      throw new Error(upErr.message);
    }

    if (custId) {
      const { data: cur } = await supabase
        .from("ai_user_prompts")
        .select("usage_count")
        .eq("id", custId)
        .single();
      const next = ((cur as { usage_count: number } | null)?.usage_count ?? 0) + 1;
      await supabase
        .from("ai_user_prompts")
        .update({
          usage_count: next,
          last_used_at: completedAt,
        })
        .eq("id", custId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      runId,
      model: modelUsed,
      resultText: text,
      resultSnippet: snippet,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const truncated = msg.slice(0, 2000);
    await supabase
      .from("ai_prompt_runs")
      .update({
        status: "failed",
        error_message: truncated,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .eq("user_id", user.id);

    return NextResponse.json(
      { error: "gemini_failed", message: truncated, runId },
      { status: 502 },
    );
  }
}
