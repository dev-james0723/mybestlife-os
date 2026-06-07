import type {
  BestFocusWindow,
  DailyPlanReview,
  PlannerFocusSession,
  PlannerStimulationEvent,
} from "@/types/database";
import { computeStimulationLoadScore } from "./stimulation-score";

export type DailyFocusMetrics = {
  plannedMinutes: number;
  actualFocusMinutes: number;
  deepWorkMinutes: number;
  meetingMinutes: number;
  recoveryMinutes: number;
  interruptionCount: number;
  stimulationLeakCount: number;
  planCompletionRatio: number;
  planAccuracyRatio: number;
  focusIntegrityScore: number;
  stimulationLoadScore: number;
  recoveryRatio: number;
  bestFocusWindow: BestFocusWindow | null;
};

export type BuildDailyFocusMetricsInput = {
  plannedMinutes: number;
  sessions: readonly PlannerFocusSession[];
  stimulationEvents: readonly PlannerStimulationEvent[];
};

export type DailyPlanReviewDraft = Pick<
  DailyPlanReview,
  | "planned_minutes"
  | "actual_focus_minutes"
  | "deep_work_minutes"
  | "meeting_minutes"
  | "recovery_minutes"
  | "interruption_count"
  | "stimulation_leak_count"
  | "plan_completion_ratio"
  | "plan_accuracy_ratio"
  | "focus_integrity_score"
  | "stimulation_load_score"
  | "recovery_ratio"
  | "best_focus_window"
  | "top_failure_pattern"
  | "tomorrow_suggestion"
  | "ai_summary"
>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundedRatio(value: number): number {
  return Math.round(value * 100) / 100;
}

function minutesBetween(startIso: string | null, endIso: string | null): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 60_000);
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function getSessionActualMinutes(session: PlannerFocusSession): number {
  if (session.actual_start_at && session.actual_end_at) {
    return minutesBetween(session.actual_start_at, session.actual_end_at);
  }
  if (session.status === "running" && session.actual_start_at) {
    return minutesBetween(session.actual_start_at, new Date().toISOString());
  }
  return 0;
}

export function getSessionPlannedMinutes(session: PlannerFocusSession): number {
  return minutesBetween(session.planned_start_at, session.planned_end_at);
}

function findBestFocusWindow(sessions: readonly PlannerFocusSession[]): BestFocusWindow | null {
  const candidates = sessions
    .filter((session) => session.actual_start_at && session.actual_end_at)
    .map((session) => ({
      session,
      actualMinutes: getSessionActualMinutes(session),
      rating: session.focus_rating ?? 0,
    }))
    .filter((candidate) => candidate.actualMinutes >= 20)
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.actualMinutes - a.actualMinutes;
    });

  const best = candidates[0];
  if (!best?.session.actual_start_at || !best.session.actual_end_at) return null;
  return {
    start: formatClock(best.session.actual_start_at),
    end: formatClock(best.session.actual_end_at),
    label: best.session.task_title,
  };
}

function computeFocusIntegrityScore(params: {
  plannedMinutes: number;
  actualFocusMinutes: number;
  interruptionCount: number;
  stimulationLeakCount: number;
  abandonedCount: number;
  completedCount: number;
  recoveryRatio: number;
}): number {
  const missedRatio =
    params.plannedMinutes > 0
      ? clamp((params.plannedMinutes - params.actualFocusMinutes) / params.plannedMinutes, 0, 1)
      : 0;
  let score = 100;
  score -= missedRatio * 30;
  score -= Math.min(24, params.interruptionCount * 4);
  score -= Math.min(30, params.stimulationLeakCount * 6);
  score -= Math.min(30, params.abandonedCount * 10);
  score += Math.min(8, params.completedCount * 2);
  if (params.recoveryRatio >= 0.08 && params.recoveryRatio <= 0.35) score += 5;
  return Math.round(clamp(score, 0, 100));
}

export function computeDailyFocusMetrics(
  input: BuildDailyFocusMetricsInput,
): DailyFocusMetrics {
  const finishedSessions = input.sessions.filter(
    (session) => session.status === "completed" || session.status === "abandoned",
  );
  const plannedMinutes =
    input.plannedMinutes > 0
      ? input.plannedMinutes
      : input.sessions.reduce((sum, session) => sum + getSessionPlannedMinutes(session), 0);

  let actualFocusMinutes = 0;
  let deepWorkMinutes = 0;
  let meetingMinutes = 0;
  let recoveryMinutes = 0;
  let interruptionCount = 0;
  let stimulationLeakCount = 0;
  let completedSessionsPlannedMinutes = 0;
  let completedCount = 0;
  let abandonedCount = 0;

  for (const session of finishedSessions) {
    const actual = getSessionActualMinutes(session);
    interruptionCount += session.interruption_count;
    stimulationLeakCount += session.stimulation_leak_count;
    if (session.status === "abandoned") abandonedCount += 1;
    if (session.completion_state === "completed") {
      completedCount += 1;
      completedSessionsPlannedMinutes += getSessionPlannedMinutes(session);
    }

    if (session.session_type === "meeting") {
      meetingMinutes += actual;
      actualFocusMinutes += actual;
    } else if (session.session_type === "recovery" || session.session_type === "personal") {
      recoveryMinutes += actual;
    } else {
      actualFocusMinutes += actual;
      if (session.session_type === "deep_work" || session.session_type === "creative") {
        deepWorkMinutes += actual;
      }
    }
  }

  const recoveryRatio = roundedRatio(
    recoveryMinutes / Math.max(actualFocusMinutes + recoveryMinutes, 1),
  );
  const stimulationLoadScore = computeStimulationLoadScore(input.stimulationEvents).score;
  const planCompletionRatio = roundedRatio(
    completedSessionsPlannedMinutes / Math.max(plannedMinutes, 1),
  );
  const planAccuracyRatio = roundedRatio(
    Math.min(actualFocusMinutes, plannedMinutes) / Math.max(plannedMinutes, 1),
  );
  const focusIntegrityScore = computeFocusIntegrityScore({
    plannedMinutes,
    actualFocusMinutes,
    interruptionCount,
    stimulationLeakCount,
    abandonedCount,
    completedCount,
    recoveryRatio,
  });

  return {
    plannedMinutes,
    actualFocusMinutes,
    deepWorkMinutes,
    meetingMinutes,
    recoveryMinutes,
    interruptionCount,
    stimulationLeakCount,
    planCompletionRatio,
    planAccuracyRatio,
    focusIntegrityScore,
    stimulationLoadScore,
    recoveryRatio,
    bestFocusWindow: findBestFocusWindow(finishedSessions),
  };
}

function inferFailurePattern(metrics: DailyFocusMetrics): string | null {
  if (metrics.stimulationLeakCount >= 3 || metrics.stimulationLoadScore >= 55) {
    return "High-stimulation route switches kept pulling attention away from the plan.";
  }
  if (metrics.interruptionCount >= 4) {
    return "The day had too many interruptions for the planned focus load.";
  }
  if (metrics.planAccuracyRatio < 0.55) {
    return "The plan overestimated how much focused execution would fit.";
  }
  if (metrics.recoveryRatio < 0.05 && metrics.actualFocusMinutes >= 180) {
    return "Recovery was too thin for the amount of focused work completed.";
  }
  return null;
}

function inferTomorrowSuggestion(metrics: DailyFocusMetrics): string | null {
  if (metrics.stimulationLoadScore >= 55) {
    return "Put the first deep-work block before opening high-stimulation routes, and keep the gate on.";
  }
  if (metrics.planAccuracyRatio < 0.7) {
    return "Plan fewer minutes tomorrow and leave a visible buffer after the first focus block.";
  }
  if (metrics.recoveryRatio < 0.08 && metrics.actualFocusMinutes >= 120) {
    return "Add one real recovery block after the longest work run.";
  }
  if (metrics.bestFocusWindow) {
    return `Protect another block around ${metrics.bestFocusWindow.start}.`;
  }
  return "Start with one clear win condition and review reality before adding more.";
}

export function buildDailyPlanReviewDraft(metrics: DailyFocusMetrics): DailyPlanReviewDraft {
  const topFailurePattern = inferFailurePattern(metrics);
  const tomorrowSuggestion = inferTomorrowSuggestion(metrics);
  return {
    planned_minutes: metrics.plannedMinutes,
    actual_focus_minutes: metrics.actualFocusMinutes,
    deep_work_minutes: metrics.deepWorkMinutes,
    meeting_minutes: metrics.meetingMinutes,
    recovery_minutes: metrics.recoveryMinutes,
    interruption_count: metrics.interruptionCount,
    stimulation_leak_count: metrics.stimulationLeakCount,
    plan_completion_ratio: metrics.planCompletionRatio,
    plan_accuracy_ratio: metrics.planAccuracyRatio,
    focus_integrity_score: metrics.focusIntegrityScore,
    stimulation_load_score: metrics.stimulationLoadScore,
    recovery_ratio: metrics.recoveryRatio,
    best_focus_window: metrics.bestFocusWindow,
    top_failure_pattern: topFailurePattern,
    tomorrow_suggestion: tomorrowSuggestion,
    ai_summary:
      topFailurePattern || tomorrowSuggestion
        ? [topFailurePattern, tomorrowSuggestion].filter(Boolean).join(" ")
        : null,
  };
}
