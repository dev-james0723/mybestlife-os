import { createClient } from "@/lib/supabase/client";
import type { CareerProfile } from "@/types/ai-coach";

export type CareerProfileUpsertInput = Partial<
  Omit<CareerProfile, "user_id" | "created_at" | "updated_at">
>;

/**
 * Completeness score (0..100) used by the Command Center dashboard. Each
 * field counts for equal weight; missing values do not crash the dashboard.
 */
export function computeProfileCompleteness(
  p: CareerProfile | null | undefined,
): number {
  if (!p) return 0;
  const checks: boolean[] = [
    !!p.current_role,
    !!p.current_company,
    !!p.industry,
    !!p.location,
    (p.years_experience ?? null) !== null,
    (p.top_skills?.length ?? 0) > 0,
    (p.target_roles?.length ?? 0) > 0,
    (p.target_industries?.length ?? 0) > 0,
    (p.target_locations?.length ?? 0) > 0,
    !!p.career_goals,
    !!p.twelve_month_goals,
    !!p.dream_scenario,
    !!p.pain_points,
    (p.career_highlights?.length ?? 0) > 0,
    !!p.primary_headshot_id,
    !!p.primary_bio_id,
    !!p.master_resume_id,
    (p.salary_expectation_min ?? null) !== null ||
      (p.salary_expectation_max ?? null) !== null,
  ];
  const hit = checks.filter(Boolean).length;
  return Math.round((hit / checks.length) * 100);
}

export const careerProfileRepository = {
  /** Returns null when the user hasn't filled anything yet. */
  async get(): Promise<CareerProfile | null> {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return null;

    const { data, error } = await supabase
      .from("career_profile")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return (data as CareerProfile | null) ?? null;
  },

  async upsert(input: CareerProfileUpsertInput): Promise<CareerProfile> {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("Not authenticated");

    const payload = {
      user_id: user.id,
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("career_profile")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return data as CareerProfile;
  },
};
