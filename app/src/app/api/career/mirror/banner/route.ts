/**
 * POST /api/career/mirror/banner
 *
 * Body: { style: CareerBannerStyle, portraitDataUrl?: string }
 *
 * Marks the profile's banner status 'generating', renders a 16:9 identity
 * banner (or an SVG fallback), persists the banner_* columns, and returns
 * { ok, banner_url, status, modelUsed }.
 */

import { NextResponse } from "next/server";
import type { CareerProfile, CareerBannerStatus } from "@/types/database";
import {
  normalizeCareerBannerStyle,
} from "@/lib/career-mirror/banner/career-banner-style-config";
import { generateCareerBanner } from "@/lib/career-mirror/banner/generateBanner";
import { requireUser, readJsonBody, aiFailure } from "../../_shared";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const style = normalizeCareerBannerStyle(body.style);
  const portraitDataUrl =
    typeof body.portraitDataUrl === "string" && body.portraitDataUrl.length > 0
      ? body.portraitDataUrl
      : undefined;

  // Pull identity/summary context for the prompt.
  const { data: profile } = await supabase
    .from("career_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const row = (profile as CareerProfile | null) ?? null;
  const identity = row?.career_identity ?? row?.current_role ?? "";
  const summary = row?.ai_summary ?? row?.current_status_summary ?? "";

  // Mark generating (best-effort).
  await supabase
    .from("career_profile")
    .update({ career_banner_status: "generating", career_banner_style: style })
    .eq("user_id", user.id);

  try {
    const banner = await generateCareerBanner({
      userId: user.id,
      style,
      identity,
      summary,
      portraitDataUrl,
      supabase,
    });

    const status: CareerBannerStatus = banner.status;
    await supabase
      .from("career_profile")
      .update({
        career_banner_url: banner.url,
        career_banner_prompt: banner.prompt,
        career_banner_style: banner.style,
        career_banner_status: status,
        career_banner_generated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      ok: true,
      banner_url: banner.url,
      status,
      modelUsed: banner.modelUsed,
    });
  } catch (e) {
    await supabase
      .from("career_profile")
      .update({ career_banner_status: "failed" })
      .eq("user_id", user.id);
    return aiFailure(e);
  }
}
