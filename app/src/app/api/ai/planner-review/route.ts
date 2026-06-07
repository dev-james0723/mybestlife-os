import { NextResponse } from "next/server";
import { getLlmResponseLanguageDirective } from "@/lib/ai/llm-response-locale";
import { fetchPlannerFocusJson, isRecord } from "@/lib/ai/planner-focus-route-utils";
import {
  buildDailyPlanReviewDraft,
  computeDailyFocusMetrics,
} from "@/lib/daily-planner/focus/review-metrics";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import type {
  BestFocusWindow,
  PlannerFocusSession,
  PlannerStimulationEvent,
} from "@/types/database";

export const runtime = "nodejs";

type PlannerReviewRequest = {
  locale?: string;
  planDate?: string;
  planSummary?: {
    plannedMinutes: number;
    actualFocusMinutes: number;
    deepWorkMinutes: number;
    recoveryMinutes: number;
    interruptionCount: number;
    stimulationLeakCount: number;
    focusIntegrityScore: number;
    stimulationLoadScore: number;
  };
  sessions?: PlannerFocusSession[];
  stimulationEvents?: PlannerStimulationEvent[];
};

type PlannerReviewResponse = {
  aiSummary: string;
  topFailurePattern: string | null;
  tomorrowSuggestion: string | null;
  bestFocusWindow: BestFocusWindow | null;
  source: "ai" | "deterministic";
};

function deterministicReview(body: PlannerReviewRequest): PlannerReviewResponse {
  const metrics = computeDailyFocusMetrics({
    plannedMinutes: body.planSummary?.plannedMinutes ?? 0,
    sessions: body.sessions ?? [],
    stimulationEvents: body.stimulationEvents ?? [],
  });
  const draft = buildDailyPlanReviewDraft(metrics);
  return {
    aiSummary:
      draft.ai_summary ??
      `Planned ${metrics.plannedMinutes} minutes and logged ${metrics.actualFocusMinutes} focused minutes.`,
    topFailurePattern: draft.top_failure_pattern,
    tomorrowSuggestion: draft.tomorrow_suggestion,
    bestFocusWindow: draft.best_focus_window,
    source: "deterministic",
  };
}

function normalizeBestFocusWindow(value: unknown, fallback: BestFocusWindow | null): BestFocusWindow | null {
  if (!isRecord(value)) return fallback;
  const start = typeof value.start === "string" ? value.start : "";
  const end = typeof value.end === "string" ? value.end : "";
  const label = typeof value.label === "string" ? value.label : "";
  if (!start || !end || !label) return fallback;
  return { start, end, label };
}

function parseAiReview(
  parsed: unknown,
  fallback: PlannerReviewResponse,
): PlannerReviewResponse {
  if (!isRecord(parsed)) return fallback;
  const aiSummary = typeof parsed.aiSummary === "string" ? parsed.aiSummary.trim() : "";
  if (!aiSummary) return fallback;
  return {
    aiSummary,
    topFailurePattern:
      typeof parsed.topFailurePattern === "string"
        ? parsed.topFailurePattern
        : fallback.topFailurePattern,
    tomorrowSuggestion:
      typeof parsed.tomorrowSuggestion === "string"
        ? parsed.tomorrowSuggestion
        : fallback.tomorrowSuggestion,
    bestFocusWindow: normalizeBestFocusWindow(parsed.bestFocusWindow, fallback.bestFocusWindow),
    source: "ai",
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as PlannerReviewRequest;
  const fallback = deterministicReview(body);
  const locale = parseAppLocale(body.locale);

  try {
    const parsed = await fetchPlannerFocusJson({
      system: [
        "You write concise planned-vs-actual review language for a personal operating system.",
        "Return only JSON: { aiSummary, topFailurePattern, tomorrowSuggestion, bestFocusWindow }.",
        "Be honest, calm, and behavioral. Do not use medical dopamine language.",
        getLlmResponseLanguageDirective(locale),
      ].join("\n"),
      user: JSON.stringify({
        planDate: body.planDate,
        planSummary: body.planSummary,
        sessions: body.sessions ?? [],
        stimulationEvents: body.stimulationEvents ?? [],
      }),
    });
    if (!parsed) return NextResponse.json(fallback);
    return NextResponse.json(parseAiReview(parsed, fallback));
  } catch {
    return NextResponse.json(fallback);
  }
}
