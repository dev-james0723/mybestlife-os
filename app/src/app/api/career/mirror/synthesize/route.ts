/**
 * POST /api/career/mirror/synthesize
 *
 * Body: { answers?: SetupAnswers, locale?: AppLocale }
 *
 * The Career Mirror's main synthesis pass. Loads the user's career_profile,
 * merges in the deterministic patch from setup answers, then runs (in order):
 * identity synthesis, diagnosis, next-actions, skill extraction (appended +
 * deduped into top_skills), goal reframe (→ ai_reframed_problem, never
 * overwriting the user's own pain_points / blockers), and blocker analysis
 * (→ blocker_category, risk_factors). Persists everything and marks setup
 * complete. Returns { ok, profile, modelUsed }.
 */

import { NextResponse } from "next/server";
import type { CareerProfile } from "@/types/database";
import type { SetupAnswers } from "@/lib/career-mirror/careerSetupTypes";
import {
  buildProfilePatchFromAnswers,
  computeSetupCompletionScore,
  computeMissingFields,
} from "@/lib/career-mirror/careerSetupMapping";
import { synthesizeCareerIdentity } from "@/lib/career-mirror/ai/synthesize";
import { diagnoseCareer } from "@/lib/career-mirror/ai/diagnosis";
import { generateNextActions } from "@/lib/career-mirror/ai/next-actions";
import { extractSkills } from "@/lib/career-mirror/ai/skills";
import { reframeGoal } from "@/lib/career-mirror/ai/reframe";
import { analyzeBlockers } from "@/lib/career-mirror/ai/blockers";
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

  const answers =
    body.answers && typeof body.answers === "object"
      ? (body.answers as SetupAnswers)
      : null;
  const locale = await resolveLocale(supabase, user.id, body);

  // Load the existing profile (RLS-scoped + explicit user filter).
  const { data: existing } = await supabase
    .from("career_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const base = (existing as CareerProfile | null) ?? null;
  const patch = answers ? buildProfilePatchFromAnswers(answers) : {};
  const merged: Partial<CareerProfile> = { ...(base ?? {}), ...patch };

  try {
    const identity = await synthesizeCareerIdentity({
      answers,
      profile: merged,
      locale,
    });
    const diagnosis = await diagnoseCareer({ profile: merged, answers, locale });
    const next = await generateNextActions({
      profile: merged,
      diagnosis: diagnosis.data,
      locale,
    });
    const skills = await extractSkills({ answers, locale });
    const reframe = await reframeGoal({
      pain_points: merged.pain_points ?? null,
      blockers: merged.blockers ?? null,
      goals: merged.career_goals ?? merged.twelve_month_goals ?? null,
      locale,
    });
    const blockers = await analyzeBlockers({
      blockers: merged.blockers ?? null,
      context: { goals: merged.career_goals, stage: identity.data.career_stage },
      locale,
    });

    // Append + dedupe skills into top_skills (never drop existing).
    const existingSkills = Array.isArray(merged.top_skills)
      ? merged.top_skills
      : [];
    const topSkills: string[] = [...existingSkills];
    for (const s of skills.data.skills) {
      if (!topSkills.includes(s)) topSkills.push(s);
    }

    const ws = identity.data.work_style_profile;
    const completionScore = answers
      ? computeSetupCompletionScore(answers)
      : (base?.completion_score ?? null);

    const update: Record<string, unknown> = {
      user_id: user.id,
      ...patch,
      // setup answers snapshot
      ...(answers ? { setup_answers: answers } : {}),
      setup_status: "completed",
      setup_completed_at: new Date().toISOString(),
      completion_score: completionScore,

      // identity synthesis
      ai_summary: identity.data.ai_summary,
      career_identity: identity.data.career_identity || null,
      career_stage: identity.data.career_stage || null,
      current_status_summary: identity.data.current_status_summary || null,
      work_style_profile: ws,
      ambition_style: identity.data.ambition_style || null,
      desired_reputation: identity.data.desired_reputation || null,
      visibility_goal: identity.data.visibility_goal || null,
      personal_brand_strategy: identity.data.personal_brand_strategy || null,
      content_strategy_direction:
        identity.data.content_strategy_direction || null,
      work_energy_pattern: ws.energy_pattern || merged.work_energy_pattern || null,
      decision_style: ws.decision_style || merged.decision_style || null,
      feedback_preference:
        ws.feedback_preference || merged.feedback_preference || null,
      ideal_work_environment:
        ws.ideal_environment || merged.ideal_work_environment || null,
      ...(ws.motivation_drivers && ws.motivation_drivers.length > 0
        ? { motivation_drivers: ws.motivation_drivers }
        : {}),
      ...(ws.organizational_triggers && ws.organizational_triggers.length > 0
        ? { organizational_triggers: ws.organizational_triggers }
        : {}),

      // diagnosis / actions / skills
      ai_diagnosis: diagnosis.data,
      ai_next_actions: next.actions,
      top_skills: topSkills,

      // reframe — NEVER overwrites the user's own pain_points / blockers
      ai_reframed_problem: reframe.data.reframed_problem,

      // blockers
      blocker_category: blockers.data.blocker_category,
      risk_factors: blockers.data.risk_factors,

      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveError } = await supabase
      .from("career_profile")
      .upsert(update, { onConflict: "user_id" })
      .select()
      .single();
    if (saveError) throw new Error(`persist_failed: ${saveError.message}`);

    // missing_fields derived from the persisted row, then patched back in.
    const missing = computeMissingFields(saved as Record<string, unknown>);
    const { data: finalRow } = await supabase
      .from("career_profile")
      .update({ missing_fields: missing })
      .eq("user_id", user.id)
      .select()
      .single();

    return NextResponse.json({
      ok: true,
      profile: (finalRow as CareerProfile | null) ?? (saved as CareerProfile),
      modelUsed: identity.modelUsed,
    });
  } catch (e) {
    return aiFailure(e);
  }
}
