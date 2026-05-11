/**
 * GET/POST /api/ai/habits/smoke
 *
 * Phase 1 sanity check: builds a trivial 1-line prompt, calls Gemini Flash
 * via the extended wrapper, and returns `{ ok, modelUsed, sample }`.
 *
 * Auth-gated so we never leak the API key through error messages to an
 * anonymous caller. Not cached — the whole point is to verify the live call.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  type GeminiResponseSchema,
} from "@/lib/ai/gemini-text";
import { requireAuthedContext, getApiKeyOrFail, errorResponse } from "../_shared";

export const runtime = "nodejs";

const SmokeSchema = z.object({
  ok: z.literal(true),
  sample: z.string().min(1).max(200),
});

const SmokeGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["ok", "sample"],
  properties: {
    ok: { type: "boolean" },
    sample: { type: "string" },
  },
};

export async function GET(request: Request) {
  return handleSmoke(request);
}

export async function POST(request: Request) {
  return handleSmoke(request);
}

async function handleSmoke(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const { data, modelUsed } = await fetchGeminiStructured<{
      ok: boolean;
      sample: string;
    }>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction:
        "Return a JSON object with `ok: true` and `sample` set to a short sentence (<= 80 chars) describing one observable habits pattern, e.g. \"Mornings did the heavy lifting this week.\"",
      userText:
        "Smoke test. Produce one example observational-voice sentence about a hypothetical week of habits.",
      responseSchema: SmokeGeminiSchema,
      temperature: 0.3,
      maxOutputTokens: 256,
    });

    const validated = SmokeSchema.safeParse(data);
    if (!validated.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "schema_validation_failed",
          issues: validated.error.issues,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      modelUsed,
      language: auth.ctx.language,
      sample: validated.data.sample,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
