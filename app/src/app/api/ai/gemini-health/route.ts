import { NextResponse } from "next/server";
import { getGeminiServerApiKey, getGeminiPlannerTextModel } from "@/lib/ai/gemini-text";
import {
  formatGeminiBillingUserMessage,
  isGeminiPrepayCreditsDepleted,
  parseGeminiFailureBody,
} from "@/lib/ai/gemini-errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * GET `/api/ai/gemini-health`
 *
 * Lightweight billing/quota probe for the server GEMINI_API_KEY (authenticated).
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message:
        "GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) is not set on the server. Add it in Vercel → Settings → Environment Variables.",
    });
  }

  const model = getGeminiPlannerTextModel();
  const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Reply with exactly: OK" }] }],
      generationConfig: { maxOutputTokens: 8 },
    }),
  });

  const rawText = await res.text();
  const fail = parseGeminiFailureBody(rawText);
  const prepayDepleted = isGeminiPrepayCreditsDepleted(res.status, rawText);

  if (res.ok) {
    return NextResponse.json({
      ok: true,
      configured: true,
      model,
      message: "Gemini API key is valid and has available quota for text requests.",
    });
  }

  return NextResponse.json({
    ok: false,
    configured: true,
    model,
    httpStatus: res.status,
    prepayCreditsDepleted: prepayDepleted,
    status: fail.status,
    message: formatGeminiBillingUserMessage(fail, [model]),
    detail: rawText.slice(0, 800),
  });
}
