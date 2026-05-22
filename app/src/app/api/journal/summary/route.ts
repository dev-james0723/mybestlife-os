import { NextResponse } from "next/server";
import { z } from "zod";

import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import {
  JOURNAL_SUMMARY_SYSTEM_PROMPT,
  buildJournalSummaryUserPrompt,
} from "@/lib/journal/ai-prompts";
import {
  SUMMARY_GEMINI_SCHEMA,
  aiOutputSchema,
} from "@/lib/journal/ai-schemas";
import { summaryRequestSchema } from "@/lib/journal/schema";
import { parseBody, requireAuthedContext } from "../_shared";

export const runtime = "nodejs";

const requestSchema = summaryRequestSchema.extend({
  entryId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;

  const parsed = parseBody(requestSchema, auth.bodyJson);
  if (!parsed.ok) return parsed.response;

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_gemini_api_key" },
      { status: 500 },
    );
  }

  try {
    const { data: raw } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction: JOURNAL_SUMMARY_SYSTEM_PROMPT,
      userText: buildJournalSummaryUserPrompt(parsed.data),
      responseSchema: SUMMARY_GEMINI_SCHEMA,
      temperature: 0.5,
      maxOutputTokens: 2048,
    });

    const validated = aiOutputSchema.parse(raw);

    // If the client provided an entryId, persist the AI output on the row.
    // We trust RLS to scope the update to the owner.
    if (parsed.data.entryId) {
      const { error: upErr } = await auth.ctx.supabase
        .from("journal_entries")
        .update({ ai_output: validated })
        .eq("id", parsed.data.entryId)
        .eq("user_id", auth.ctx.userId);
      if (upErr) {
        return NextResponse.json(
          {
            error: "ai_persist_failed",
            detail: upErr.message,
            aiOutput: validated,
          },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({ aiOutput: validated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "ai_generation_failed", detail: msg.slice(0, 500) },
      { status: 502 },
    );
  }
}
