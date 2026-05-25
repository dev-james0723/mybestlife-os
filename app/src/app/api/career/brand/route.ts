/**
 * POST /api/career/brand
 *
 * Body: { locale? }
 *
 * Generates a personal-brand strategy from the profile, persists
 * personal_brand_strategy + content_strategy_direction on career_profile, and
 * returns { ok, brand }.
 */

import { NextResponse } from "next/server";
import type { CareerProfile } from "@/types/database";
import { personalBrandStrategy } from "@/lib/career-mirror/ai/brand";
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
    const { data: brand } = await personalBrandStrategy({
      profile: (profile as CareerProfile | null) ?? {},
      locale,
    });

    await supabase
      .from("career_profile")
      .upsert(
        {
          user_id: user.id,
          personal_brand_strategy: brand.personal_brand_strategy,
          content_strategy_direction: brand.content_strategy_direction,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    return NextResponse.json({ ok: true, brand });
  } catch (e) {
    return aiFailure(e);
  }
}
