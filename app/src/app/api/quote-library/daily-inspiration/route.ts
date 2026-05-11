/**
 * GET /api/quote-library/daily-inspiration
 *
 * Up to `limit` favorite quotes eligible for surfacing today. Consumed by
 * the Dashboard's Daily Inspiration card (SDK entry `getFavoritesForDailyInspiration`).
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? 5);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.round(limitRaw), 1), 20)
    : 5;

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const cutoff = twoWeeksAgo.toISOString().slice(0, 10);

  // Prefer favorites unsurfaced in the last 14 days. If too few, top up
  // with any favorite.
  const { data: fresh } = await supabase
    .from("quotes")
    .select("id, quote_text, source_author, category, emotion_tone, is_favorite, last_surfaced_on")
    .eq("is_favorite", true)
    .or(`last_surfaced_on.is.null,last_surfaced_on.lt.${cutoff}`)
    .order("last_surfaced_on", { ascending: true, nullsFirst: true })
    .limit(limit);

  const collected = fresh ?? [];
  if (collected.length < limit) {
    const { data: rest } = await supabase
      .from("quotes")
      .select("id, quote_text, source_author, category, emotion_tone, is_favorite, last_surfaced_on")
      .eq("is_favorite", true)
      .not("id", "in", `(${collected.map((q) => `'${q.id}'`).join(",") || "''"})`)
      .order("last_surfaced_on", { ascending: true, nullsFirst: true })
      .limit(limit - collected.length);
    if (rest) collected.push(...rest);
  }

  return NextResponse.json(
    collected.map((q) => ({
      quote_id: q.id,
      quote_text: q.quote_text,
      source_author: q.source_author,
      category: q.category,
      emotion_tone: q.emotion_tone,
      is_favorite: q.is_favorite,
    })),
  );
}
