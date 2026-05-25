/**
 * /api/career/weekly-review
 *
 * GET  — ?all=1 lists reviews (newest first); otherwise returns the latest one.
 *        → { ok, reviews } | { ok, review }
 * POST — body { week_start?: string (YYYY-MM-DD), locale? }: generate the
 *        review against the profile + recent activity and upsert it on
 *        (user_id, week_start). → { ok, review }
 */

import { NextResponse } from "next/server";
import type { CareerProfile, CareerWeeklyReview } from "@/types/database";
import { generateWeeklyReview } from "@/lib/career-mirror/ai/weekly-review";
import {
  requireUser,
  readJsonBody,
  resolveLocale,
  aiFailure,
} from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Monday (ISO) of the week containing `d`, as YYYY-MM-DD. */
function weekStartOf(d: Date): string {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  copy.setUTCDate(copy.getUTCDate() - diff);
  return copy.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const url = new URL(request.url);
  const wantAll = url.searchParams.get("all") === "1";

  let query = supabase
    .from("career_weekly_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false });
  if (!wantAll) query = query.limit(1);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
  const rows = (data as CareerWeeklyReview[]) ?? [];
  if (wantAll) return NextResponse.json({ ok: true, reviews: rows });
  return NextResponse.json({ ok: true, review: rows[0] ?? null });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const weekStart =
    typeof body.week_start === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(body.week_start)
      ? body.week_start
      : weekStartOf(new Date());
  const locale = await resolveLocale(supabase, user.id, body);

  const { data: profile } = await supabase
    .from("career_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // Recent activity context: latest scenarios + memory entries.
  const [{ data: recentScenarios }, { data: recentMemory }] = await Promise.all([
    supabase
      .from("career_scenarios")
      .select("title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("career_memory")
      .select("kind, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  try {
    const { data: review, modelUsed } = await generateWeeklyReview({
      profile: (profile as CareerProfile | null) ?? {},
      recent: { scenarios: recentScenarios ?? [], memory: recentMemory ?? [] },
      locale,
    });

    const { data: upserted, error: upsertError } = await supabase
      .from("career_weekly_reviews")
      .upsert(
        {
          user_id: user.id,
          week_start: weekStart,
          review,
          model_used: modelUsed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,week_start" },
      )
      .select()
      .single();
    if (upsertError) throw new Error(`persist_failed: ${upsertError.message}`);

    return NextResponse.json({
      ok: true,
      review: upserted as CareerWeeklyReview,
    });
  } catch (e) {
    return aiFailure(e);
  }
}
