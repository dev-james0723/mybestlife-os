/**
 * POST /api/career/mirror/section-insight
 *
 * Body: { section: string, answers?: SetupAnswers, locale?: AppLocale }
 *
 * Returns one short, sharp "seen-through" insight for a setup section, shown
 * inline as the user answers. Returns { ok, insight }.
 */

import { NextResponse } from "next/server";
import type { SetupAnswers } from "@/lib/career-mirror/careerSetupTypes";
import { generateSectionInsight } from "@/lib/career-mirror/ai/section-insight";
import {
  requireUser,
  readJsonBody,
  resolveLocale,
  aiFailure,
} from "../../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const section =
    typeof body.section === "string" ? body.section.trim() : "";
  if (!section) {
    return NextResponse.json({ error: "missing_section" }, { status: 400 });
  }
  const answers =
    body.answers && typeof body.answers === "object"
      ? (body.answers as SetupAnswers)
      : null;
  const locale = await resolveLocale(supabase, user.id, body);

  try {
    const { data } = await generateSectionInsight({ section, answers, locale });
    return NextResponse.json({ ok: true, insight: data.insight });
  } catch (e) {
    return aiFailure(e);
  }
}
