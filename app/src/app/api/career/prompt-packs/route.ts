/**
 * /api/career/prompt-packs
 *
 * GET  — list the user's generated prompt packs (newest first) → { ok, packs }
 * POST — body { title?: string, locale? }: generate a personalised prompt pack
 *        from the profile, insert the row, return { ok, pack }
 */

import { NextResponse } from "next/server";
import type { CareerProfile, CareerPromptPack } from "@/types/database";
import { generatePromptPack } from "@/lib/career-mirror/ai/prompt-pack";
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
    .from("career_prompt_packs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
  return NextResponse.json({
    ok: true,
    packs: (data as CareerPromptPack[]) ?? [],
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : null;
  const locale = await resolveLocale(supabase, user.id, body);

  const { data: profile } = await supabase
    .from("career_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const { data: result } = await generatePromptPack({
      profile: (profile as CareerProfile | null) ?? {},
      locale,
    });

    const { data: inserted, error: insertError } = await supabase
      .from("career_prompt_packs")
      .insert({
        user_id: user.id,
        title,
        prompts: result.prompts,
        generated_for: { source: "career-mirror" },
      })
      .select()
      .single();
    if (insertError) throw new Error(`persist_failed: ${insertError.message}`);

    return NextResponse.json({ ok: true, pack: inserted as CareerPromptPack });
  } catch (e) {
    return aiFailure(e);
  }
}
