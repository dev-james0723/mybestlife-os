/**
 * /api/career/scenarios
 *
 * GET  — list the user's saved scenarios (newest first) → { ok, scenarios }
 * POST — body { title: string, inputs: object, locale? }: run a simulation
 *        against the profile, insert the row, return { ok, scenario }
 */

import { NextResponse } from "next/server";
import type { CareerProfile, CareerScenario } from "@/types/database";
import { simulateScenario } from "@/lib/career-mirror/ai/scenario";
import {
  requireUser,
  readJsonBody,
  resolveLocale,
  aiFailure,
} from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("career_scenarios")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
  return NextResponse.json({
    ok: true,
    scenarios: (data as CareerScenario[]) ?? [],
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "missing_title" }, { status: 400 });
  }
  const inputs =
    body.inputs && typeof body.inputs === "object" && !Array.isArray(body.inputs)
      ? (body.inputs as Record<string, unknown>)
      : {};
  const locale = await resolveLocale(supabase, user.id, body);

  const { data: profile } = await supabase
    .from("career_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const { data: result } = await simulateScenario({
      inputs,
      profile: (profile as CareerProfile | null) ?? {},
      locale,
    });

    const { data: inserted, error: insertError } = await supabase
      .from("career_scenarios")
      .insert({ user_id: user.id, title, inputs, result })
      .select()
      .single();
    if (insertError) throw new Error(`persist_failed: ${insertError.message}`);

    return NextResponse.json({
      ok: true,
      scenario: inserted as CareerScenario,
    });
  } catch (e) {
    return aiFailure(e);
  }
}
