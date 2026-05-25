/**
 * POST /api/career/mirror/reality-check
 *
 * Body: { target: string, locale?: AppLocale }
 *
 * Honest assessment of whether a stated target is realistic for this person
 * right now. Returns { ok, result }.
 */

import { NextResponse } from "next/server";
import type { CareerProfile } from "@/types/database";
import { realityCheck } from "@/lib/career-mirror/ai/reality-check";
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

  const target = typeof body.target === "string" ? body.target.trim() : "";
  if (!target) {
    return NextResponse.json({ error: "missing_target" }, { status: 400 });
  }
  const locale = await resolveLocale(supabase, user.id, body);

  const { data: profile } = await supabase
    .from("career_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const { data } = await realityCheck({
      target,
      profile: (profile as CareerProfile | null) ?? {},
      locale,
    });
    return NextResponse.json({ ok: true, result: data });
  } catch (e) {
    return aiFailure(e);
  }
}
