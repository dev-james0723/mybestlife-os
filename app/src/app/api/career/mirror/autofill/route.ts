/**
 * POST /api/career/mirror/autofill
 *
 * Body: { categories?: string[], locale?: AppLocale }
 *
 * REVIEW-ONLY. Loads + extracts text from the user's Career Vault documents and
 * proposes profile-field suggestions with per-field confidence. Writes nothing.
 * Returns { ok, suggestions, confidence }.
 */

import { NextResponse } from "next/server";
import {
  loadCareerVaultDocText,
  autofillFromDocs,
} from "@/lib/career-mirror/ai/autofill";
import {
  requireUser,
  readJsonBody,
  resolveLocale,
  aiFailure,
} from "../../_shared";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const categories = Array.isArray(body.categories)
    ? body.categories.filter((c): c is string => typeof c === "string")
    : undefined;
  const locale = await resolveLocale(supabase, user.id, body);

  try {
    const docTexts = await loadCareerVaultDocText(supabase, user.id, categories);
    const { suggested, confidence } = await autofillFromDocs({
      docTexts,
      locale,
    });
    return NextResponse.json({
      ok: true,
      suggestions: suggested,
      confidence,
    });
  } catch (e) {
    return aiFailure(e);
  }
}
