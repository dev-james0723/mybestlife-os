import { createClient } from "@/lib/supabase/client";
import type { BestFocusWindow, DailyPlanReview } from "@/types/database";
import { getCurrentUserId, LOCAL_DEV_USER_ID } from "./current-user";
import {
  createLocalId,
  isBrowserLocalFocusRealityMode,
  isRecord,
  nowIso,
  readLocalJson,
  safeNullableString,
  safeNumber,
  safeString,
  writeLocalJson,
} from "./focus-reality-local";

const LOCAL_REVIEW_PREFIX = "mylifeos:daily-plan-review:v1:";

export type UpsertDailyPlanReviewInput = Omit<
  DailyPlanReview,
  "id" | "user_id" | "created_at" | "updated_at"
> & {
  id?: string;
};

function localReviewKey(planDate: string): string {
  return `${LOCAL_REVIEW_PREFIX}${planDate}`;
}

function normalizeRatio(value: unknown): number {
  return Math.max(0, Math.round(safeNumber(value, 0) * 100) / 100);
}

function normalizeScore(value: unknown): number {
  return Math.min(100, Math.max(0, Math.round(safeNumber(value, 0))));
}

function normalizeBestFocusWindow(value: unknown): BestFocusWindow | null {
  if (!isRecord(value)) return null;
  const start = safeString(value.start);
  const end = safeString(value.end);
  const label = safeString(value.label);
  if (!start || !end || !label) return null;
  return { start, end, label };
}

export function normalizeDailyPlanReview(value: unknown): DailyPlanReview | null {
  if (!isRecord(value)) return null;
  const planDate = safeString(value.plan_date);
  if (!planDate) return null;
  return {
    id: safeString(value.id, createLocalId("daily-review")),
    user_id: safeString(value.user_id, LOCAL_DEV_USER_ID),
    daily_plan_id: safeNullableString(value.daily_plan_id),
    plan_date: planDate,
    planned_minutes: Math.max(0, Math.round(safeNumber(value.planned_minutes, 0))),
    actual_focus_minutes: Math.max(0, Math.round(safeNumber(value.actual_focus_minutes, 0))),
    deep_work_minutes: Math.max(0, Math.round(safeNumber(value.deep_work_minutes, 0))),
    meeting_minutes: Math.max(0, Math.round(safeNumber(value.meeting_minutes, 0))),
    recovery_minutes: Math.max(0, Math.round(safeNumber(value.recovery_minutes, 0))),
    interruption_count: Math.max(0, Math.round(safeNumber(value.interruption_count, 0))),
    stimulation_leak_count: Math.max(0, Math.round(safeNumber(value.stimulation_leak_count, 0))),
    plan_completion_ratio: normalizeRatio(value.plan_completion_ratio),
    plan_accuracy_ratio: normalizeRatio(value.plan_accuracy_ratio),
    focus_integrity_score: normalizeScore(value.focus_integrity_score),
    stimulation_load_score: normalizeScore(value.stimulation_load_score),
    recovery_ratio: normalizeRatio(value.recovery_ratio),
    best_focus_window: normalizeBestFocusWindow(value.best_focus_window),
    top_failure_pattern: safeNullableString(value.top_failure_pattern),
    tomorrow_suggestion: safeNullableString(value.tomorrow_suggestion),
    ai_summary: safeNullableString(value.ai_summary),
    saved_to_journal_entry_id: safeNullableString(value.saved_to_journal_entry_id),
    created_at: safeString(value.created_at, nowIso()),
    updated_at: safeString(value.updated_at, nowIso()),
  };
}

function readLocalReview(planDate: string): DailyPlanReview | null {
  return readLocalJson<DailyPlanReview | null>(
    localReviewKey(planDate),
    null,
    normalizeDailyPlanReview,
  );
}

function writeLocalReview(review: DailyPlanReview): DailyPlanReview {
  writeLocalJson(localReviewKey(review.plan_date), review);
  return review;
}

function readLocalRange(from: string, to: string): DailyPlanReview[] {
  if (typeof window === "undefined") return [];
  const reviews: DailyPlanReview[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(LOCAL_REVIEW_PREFIX)) continue;
    const planDate = key.slice(LOCAL_REVIEW_PREFIX.length);
    if (planDate < from || planDate > to) continue;
    const review = readLocalReview(planDate);
    if (review) reviews.push(review);
  }
  return reviews.sort((a, b) => a.plan_date.localeCompare(b.plan_date));
}

export const dailyPlanReviewsRepository = {
  async getByDate(planDate: string): Promise<DailyPlanReview | null> {
    if (isBrowserLocalFocusRealityMode()) return readLocalReview(planDate);
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("daily_plan_reviews")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_date", planDate)
      .maybeSingle();
    if (error) throw error;
    return normalizeDailyPlanReview(data);
  },

  async upsert(input: UpsertDailyPlanReviewInput): Promise<DailyPlanReview> {
    const now = nowIso();
    if (isBrowserLocalFocusRealityMode()) {
      const existing = readLocalReview(input.plan_date);
      return writeLocalReview({
        id: input.id ?? existing?.id ?? createLocalId("daily-review"),
        user_id: LOCAL_DEV_USER_ID,
        daily_plan_id: input.daily_plan_id,
        plan_date: input.plan_date,
        planned_minutes: input.planned_minutes,
        actual_focus_minutes: input.actual_focus_minutes,
        deep_work_minutes: input.deep_work_minutes,
        meeting_minutes: input.meeting_minutes,
        recovery_minutes: input.recovery_minutes,
        interruption_count: input.interruption_count,
        stimulation_leak_count: input.stimulation_leak_count,
        plan_completion_ratio: input.plan_completion_ratio,
        plan_accuracy_ratio: input.plan_accuracy_ratio,
        focus_integrity_score: input.focus_integrity_score,
        stimulation_load_score: input.stimulation_load_score,
        recovery_ratio: input.recovery_ratio,
        best_focus_window: input.best_focus_window,
        top_failure_pattern: input.top_failure_pattern,
        tomorrow_suggestion: input.tomorrow_suggestion,
        ai_summary: input.ai_summary,
        saved_to_journal_entry_id: input.saved_to_journal_entry_id,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      });
    }

    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("daily_plan_reviews")
      .upsert(
        {
          user_id: userId,
          daily_plan_id: input.daily_plan_id,
          plan_date: input.plan_date,
          planned_minutes: input.planned_minutes,
          actual_focus_minutes: input.actual_focus_minutes,
          deep_work_minutes: input.deep_work_minutes,
          meeting_minutes: input.meeting_minutes,
          recovery_minutes: input.recovery_minutes,
          interruption_count: input.interruption_count,
          stimulation_leak_count: input.stimulation_leak_count,
          plan_completion_ratio: input.plan_completion_ratio,
          plan_accuracy_ratio: input.plan_accuracy_ratio,
          focus_integrity_score: input.focus_integrity_score,
          stimulation_load_score: input.stimulation_load_score,
          recovery_ratio: input.recovery_ratio,
          best_focus_window: input.best_focus_window,
          top_failure_pattern: input.top_failure_pattern,
          tomorrow_suggestion: input.tomorrow_suggestion,
          ai_summary: input.ai_summary,
          saved_to_journal_entry_id: input.saved_to_journal_entry_id,
          updated_at: now,
        },
        { onConflict: "user_id,plan_date" },
      )
      .select()
      .single();
    if (error) throw error;
    const normalized = normalizeDailyPlanReview(data);
    if (!normalized) throw new Error("Invalid daily review response.");
    return normalized;
  },

  async getRange(from: string, to: string): Promise<DailyPlanReview[]> {
    if (isBrowserLocalFocusRealityMode()) return readLocalRange(from, to);
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("daily_plan_reviews")
      .select("*")
      .eq("user_id", userId)
      .gte("plan_date", from)
      .lte("plan_date", to)
      .order("plan_date", { ascending: true });
    if (error) throw error;
    if (!Array.isArray(data)) return [];
    return data
      .map(normalizeDailyPlanReview)
      .filter((review): review is DailyPlanReview => review !== null);
  },
};
