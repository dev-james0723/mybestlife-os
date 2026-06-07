import { createClient } from "@/lib/supabase/client";
import type {
  BreakStatus,
  DailyPlanQualityReport,
  PlanQualityIssue,
  PlanQualityIssueSeverity,
  PlanQualityIssueType,
  PlanQualityRiskLevel,
  PlanQualitySuggestedChange,
  PlanQualitySuggestedChangeType,
  StimulationRisk,
} from "@/types/database";
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
  safeStringArray,
  writeLocalJson,
} from "./focus-reality-local";

const LOCAL_QUALITY_PREFIX = "mylifeos:daily-plan-quality:v1:";

const RISK_LEVELS: readonly PlanQualityRiskLevel[] = ["low", "medium", "high"];
const BREAK_STATUSES: readonly BreakStatus[] = ["good", "thin", "missing", "unknown"];
const ISSUE_TYPES: readonly PlanQualityIssueType[] = [
  "overload",
  "calendar_conflict",
  "missing_break",
  "long_work_run",
  "context_switching",
  "high_stimulation",
  "weak_deep_work_protection",
];
const ISSUE_SEVERITIES: readonly PlanQualityIssueSeverity[] = [
  "info",
  "warning",
  "critical",
];
const CHANGE_TYPES: readonly PlanQualitySuggestedChangeType[] = [
  "add_break",
  "move_task",
  "merge_admin",
  "protect_deep_work",
  "reduce_scope",
  "convert_to_low_stim",
];

export type UpsertDailyPlanQualityReportInput = Omit<
  DailyPlanQualityReport,
  "id" | "user_id" | "created_at" | "updated_at"
> & {
  id?: string;
};

function localQualityKey(planDate: string): string {
  return `${LOCAL_QUALITY_PREFIX}${planDate}`;
}

function isRisk(value: unknown): value is PlanQualityRiskLevel {
  return typeof value === "string" && RISK_LEVELS.includes(value as PlanQualityRiskLevel);
}

function isBreakStatus(value: unknown): value is BreakStatus {
  return typeof value === "string" && BREAK_STATUSES.includes(value as BreakStatus);
}

function isStimulationRisk(value: unknown): value is StimulationRisk {
  return isRisk(value);
}

function isIssueType(value: unknown): value is PlanQualityIssueType {
  return typeof value === "string" && ISSUE_TYPES.includes(value as PlanQualityIssueType);
}

function isSeverity(value: unknown): value is PlanQualityIssueSeverity {
  return typeof value === "string" && ISSUE_SEVERITIES.includes(value as PlanQualityIssueSeverity);
}

function isChangeType(value: unknown): value is PlanQualitySuggestedChangeType {
  return typeof value === "string" && CHANGE_TYPES.includes(value as PlanQualitySuggestedChangeType);
}

function normalizeIssue(value: unknown): PlanQualityIssue | null {
  if (!isRecord(value) || !isIssueType(value.type)) return null;
  return {
    id: safeString(value.id, createLocalId("quality-issue")),
    type: value.type,
    severity: isSeverity(value.severity) ? value.severity : "warning",
    title: safeString(value.title, "Plan quality issue"),
    description: safeString(value.description),
    affectedPlannerTaskIds: safeStringArray(value.affectedPlannerTaskIds),
  };
}

function normalizeSuggestedChange(value: unknown): PlanQualitySuggestedChange | null {
  if (!isRecord(value) || !isChangeType(value.type) || !isRecord(value.patch)) return null;
  const action = value.patch.action;
  if (typeof action !== "string") return null;
  return {
    id: safeString(value.id, createLocalId("quality-change")),
    type: value.type,
    title: safeString(value.title, "Plan improvement"),
    description: safeString(value.description),
    patch: value.patch as PlanQualitySuggestedChange["patch"],
    safeToAutoApply:
      typeof value.safeToAutoApply === "boolean" ? value.safeToAutoApply : false,
  };
}

function normalizeIssueList(value: unknown): PlanQualityIssue[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeIssue)
    .filter((item): item is PlanQualityIssue => item !== null);
}

function normalizeChangeList(value: unknown): PlanQualitySuggestedChange[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeSuggestedChange)
    .filter((item): item is PlanQualitySuggestedChange => item !== null);
}

export function normalizeDailyPlanQualityReport(
  value: unknown,
): DailyPlanQualityReport | null {
  if (!isRecord(value)) return null;
  const planDate = safeString(value.plan_date);
  const summary = safeString(value.summary);
  if (!planDate || !summary) return null;
  const score = Math.min(100, Math.max(0, Math.round(safeNumber(value.score, 0))));
  return {
    id: safeString(value.id, createLocalId("quality-report")),
    user_id: safeString(value.user_id, LOCAL_DEV_USER_ID),
    daily_plan_id: safeNullableString(value.daily_plan_id),
    plan_date: planDate,
    score,
    risk_level: isRisk(value.risk_level)
      ? value.risk_level
      : score >= 80
        ? "low"
        : score >= 60
          ? "medium"
          : "high",
    summary,
    top_issue: safeNullableString(value.top_issue),
    focus_target_minutes: Math.max(0, Math.round(safeNumber(value.focus_target_minutes, 0))),
    break_status: isBreakStatus(value.break_status) ? value.break_status : "unknown",
    stimulation_risk: isStimulationRisk(value.stimulation_risk)
      ? value.stimulation_risk
      : "medium",
    issues: normalizeIssueList(value.issues),
    suggested_changes: normalizeChangeList(value.suggested_changes),
    source_hash: safeNullableString(value.source_hash),
    created_at: safeString(value.created_at, nowIso()),
    updated_at: safeString(value.updated_at, nowIso()),
  };
}

function readLocalReport(planDate: string): DailyPlanQualityReport | null {
  return readLocalJson<DailyPlanQualityReport | null>(
    localQualityKey(planDate),
    null,
    normalizeDailyPlanQualityReport,
  );
}

function writeLocalReport(report: DailyPlanQualityReport): DailyPlanQualityReport {
  writeLocalJson(localQualityKey(report.plan_date), report);
  return report;
}

export const dailyPlanQualityReportsRepository = {
  async getByDate(planDate: string): Promise<DailyPlanQualityReport | null> {
    if (isBrowserLocalFocusRealityMode()) return readLocalReport(planDate);
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("daily_plan_quality_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_date", planDate)
      .maybeSingle();
    if (error) throw error;
    return normalizeDailyPlanQualityReport(data);
  },

  async upsert(
    input: UpsertDailyPlanQualityReportInput,
  ): Promise<DailyPlanQualityReport> {
    const now = nowIso();
    if (isBrowserLocalFocusRealityMode()) {
      const existing = readLocalReport(input.plan_date);
      return writeLocalReport({
        id: input.id ?? existing?.id ?? createLocalId("quality-report"),
        user_id: LOCAL_DEV_USER_ID,
        daily_plan_id: input.daily_plan_id,
        plan_date: input.plan_date,
        score: input.score,
        risk_level: input.risk_level,
        summary: input.summary,
        top_issue: input.top_issue,
        focus_target_minutes: input.focus_target_minutes,
        break_status: input.break_status,
        stimulation_risk: input.stimulation_risk,
        issues: input.issues,
        suggested_changes: input.suggested_changes,
        source_hash: input.source_hash,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      });
    }

    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("daily_plan_quality_reports")
      .upsert(
        {
          user_id: userId,
          daily_plan_id: input.daily_plan_id,
          plan_date: input.plan_date,
          score: input.score,
          risk_level: input.risk_level,
          summary: input.summary,
          top_issue: input.top_issue,
          focus_target_minutes: input.focus_target_minutes,
          break_status: input.break_status,
          stimulation_risk: input.stimulation_risk,
          issues: input.issues,
          suggested_changes: input.suggested_changes,
          source_hash: input.source_hash,
          updated_at: now,
        },
        { onConflict: "user_id,plan_date" },
      )
      .select()
      .single();
    if (error) throw error;
    const normalized = normalizeDailyPlanQualityReport(data);
    if (!normalized) throw new Error("Invalid plan quality report response.");
    return normalized;
  },

  async deleteForDate(planDate: string): Promise<void> {
    if (isBrowserLocalFocusRealityMode()) {
      if (typeof window !== "undefined") window.localStorage.removeItem(localQualityKey(planDate));
      return;
    }
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from("daily_plan_quality_reports")
      .delete()
      .eq("user_id", userId)
      .eq("plan_date", planDate);
    if (error) throw error;
  },
};
