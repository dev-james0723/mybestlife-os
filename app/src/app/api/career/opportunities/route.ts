/**
 * POST /api/career/opportunities
 *
 * Body: { locale? }
 *
 * Matches the user to opportunities they're well positioned for, based on their
 * profile. Returns { ok, opportunities }. Does not persist.
 */

import { NextResponse } from "next/server";
import type { CareerProfile } from "@/types/database";
import { matchOpportunities } from "@/lib/career-mirror/ai/opportunities";
import {
  requireUser,
  readJsonBody,
  resolveLocale,
  aiFailure,
} from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const locale = await resolveLocale(supabase, user.id, parsed.body);

  const { data: profile } = await supabase
    .from("career_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const { data } = await matchOpportunities({
      profile: (profile as CareerProfile | null) ?? {},
      locale,
    });
    return NextResponse.json({ ok: true, opportunities: data.opportunities });
  } catch (e) {
    return aiFailure(e);
  }
}
