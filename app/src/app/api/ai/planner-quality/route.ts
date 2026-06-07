import { NextResponse } from "next/server";
import { getLlmResponseLanguageDirective } from "@/lib/ai/llm-response-locale";
import { fetchPlannerFocusJson, isRecord } from "@/lib/ai/planner-focus-route-utils";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import type {
  PlanQualityIssue,
  PlanQualitySuggestedChange,
} from "@/types/database";

export const runtime = "nodejs";

type PlannerQualityRequest = {
  locale?: string;
  planDate?: string;
  deterministicReport?: {
    summary: string;
    top_issue: string | null;
    issues: PlanQualityIssue[];
    suggested_changes: PlanQualitySuggestedChange[];
  };
  tasks?: Array<{
    plannerTaskId?: string;
    title: string;
    start?: string;
    end?: string;
    blocks?: number;
    category?: string;
  }>;
  calendarContext?: Array<{
    title: string;
    start: string;
    end: string;
  }>;
};

type PlannerQualityResponse = {
  summary: string;
  topIssue: string | null;
  issues: PlanQualityIssue[];
  suggestedChanges: PlanQualitySuggestedChange[];
  source: "ai" | "deterministic";
};

function fallbackResponse(body: PlannerQualityRequest): PlannerQualityResponse {
  const report = body.deterministicReport;
  return {
    summary: report?.summary ?? "Plan quality was checked deterministically.",
    topIssue: report?.top_issue ?? null,
    issues: report?.issues ?? [],
    suggestedChanges: report?.suggested_changes ?? [],
    source: "deterministic",
  };
}

function parseAiResponse(
  parsed: unknown,
  fallback: PlannerQualityResponse,
): PlannerQualityResponse {
  if (!isRecord(parsed)) return fallback;
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (!summary) return fallback;
  const topIssue =
    typeof parsed.topIssue === "string"
      ? parsed.topIssue
      : typeof parsed.top_issue === "string"
        ? parsed.top_issue
        : fallback.topIssue;
  return {
    summary,
    topIssue,
    issues: Array.isArray(parsed.issues)
      ? (parsed.issues as PlanQualityIssue[])
      : fallback.issues,
    suggestedChanges: Array.isArray(parsed.suggestedChanges)
      ? (parsed.suggestedChanges as PlanQualitySuggestedChange[])
      : Array.isArray(parsed.suggested_changes)
        ? (parsed.suggested_changes as PlanQualitySuggestedChange[])
        : fallback.suggestedChanges,
    source: "ai",
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as PlannerQualityRequest;
  const fallback = fallbackResponse(body);
  const locale = parseAppLocale(body.locale);

  try {
    const parsed = await fetchPlannerFocusJson({
      system: [
        "You improve Daily Planner plan-quality explanations for a personal operating system.",
        "Return only JSON: { summary, topIssue, issues, suggestedChanges }.",
        "Do not use medical dopamine claims. Use behavioral language: stimulation load, focus integrity, planned vs actual.",
        "Do not invent tasks or delete tasks. Preserve plannerTaskId/taskId inside issue/change payloads.",
        getLlmResponseLanguageDirective(locale),
      ].join("\n"),
      user: JSON.stringify({
        planDate: body.planDate,
        deterministicReport: body.deterministicReport,
        tasks: body.tasks ?? [],
        calendarContext: body.calendarContext ?? [],
      }),
    });
    if (!parsed) return NextResponse.json(fallback);
    return NextResponse.json(parseAiResponse(parsed, fallback));
  } catch {
    return NextResponse.json(fallback);
  }
}
