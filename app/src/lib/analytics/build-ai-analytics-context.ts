import type {
  AIAnalyticsContext,
  AIAnalyticsInsight,
  DomainRadar,
  ProjectMomentumMap,
} from "./types";
import type { AnalyticsRange, AnalyticsTotals, BrainHealth, LifePulseScore } from "./types";

function score(scores: LifePulseScore[], key: LifePulseScore["key"]): number {
  return scores.find((item) => item.key === key)?.score ?? 0;
}

function lowestScore(scores: LifePulseScore[]): LifePulseScore | null {
  if (scores.length === 0) return null;
  return [...scores].sort((a, b) => a.score - b.score)[0] ?? null;
}

function highestScore(scores: LifePulseScore[]): LifePulseScore | null {
  if (scores.length === 0) return null;
  return [...scores].sort((a, b) => b.score - a.score)[0] ?? null;
}

export function buildAIAnalyticsContext(params: {
  range: AnalyticsRange;
  pulseScores: LifePulseScore[];
  totals: AnalyticsTotals;
  projectMomentum: ProjectMomentumMap;
  brainHealth: BrainHealth;
  domainRadar: DomainRadar;
  emotionExecution: AIAnalyticsContext["emotionExecution"];
}): AIAnalyticsContext {
  const stuckProjects =
    params.projectMomentum.stateCounts.stuck +
    params.projectMomentum.stateCounts.overloaded;
  const movingProjects =
    params.projectMomentum.stateCounts.accelerating +
    params.projectMomentum.stateCounts.steady +
    params.projectMomentum.stateCounts.ready_to_finish;

  return {
    range: {
      key: params.range.key,
      label: params.range.label,
      startISO: params.range.startISO,
      endISO: params.range.endISO,
      days: params.range.days,
    },
    pulseScores: params.pulseScores,
    totals: params.totals,
    projectMomentum: {
      stateCounts: params.projectMomentum.stateCounts,
      stuckProjects,
      overloadedProjects: params.projectMomentum.stateCounts.overloaded,
      movingProjects,
    },
    emotionExecution: params.emotionExecution,
    brainHealth: params.brainHealth,
    domainRadar: params.domainRadar,
  };
}

export function buildLocalAIAnalyticsInsight(
  context: AIAnalyticsContext,
): AIAnalyticsInsight {
  const completion = score(context.pulseScores, "completion_momentum");
  const focus = score(context.pulseScores, "focus_consistency");
  const load = score(context.pulseScores, "emotional_load");
  const coherence = score(context.pulseScores, "system_coherence");
  const strongest = highestScore(context.pulseScores);
  const weakest = lowestScore(context.pulseScores);
  const topDomain = [...context.domainRadar.points].sort((a, b) => b.score - a.score)[0];
  const quietDomain = [...context.domainRadar.points].sort((a, b) => a.score - b.score)[0];

  const progress: string[] = [];
  if (completion >= 60) {
    progress.push(
      `${context.totals.completedTasks} tasks were completed in this lens. That is real execution, not just planning.`,
    );
  }
  if (context.totals.studyMinutes > 0) {
    progress.push(
      `${Math.round(context.totals.studyMinutes / 60)} hours of study/practice stayed alive alongside the task system.`,
    );
  }
  if (context.projectMomentum.movingProjects > 0) {
    progress.push(
      `${context.projectMomentum.movingProjects} project${context.projectMomentum.movingProjects === 1 ? " is" : "s are"} visibly moving.`,
    );
  }
  if (progress.length === 0) {
    progress.push(
      "Progress is not strongly visible in this range. The useful move is to identify whether this was rest or drift.",
    );
  }

  const blindSpots: string[] = [];
  if (focus < 55) {
    blindSpots.push(
      "A meaningful share of activity is not clearly attached to projects or goals.",
    );
  }
  if (context.totals.overdueTasks > 0) {
    blindSpots.push(
      `${context.totals.overdueTasks} overdue task${context.totals.overdueTasks === 1 ? " is" : "s are"} creating background pressure.`,
    );
  }
  if (context.projectMomentum.stuckProjects > 0) {
    blindSpots.push(
      `${context.projectMomentum.stuckProjects} project${context.projectMomentum.stuckProjects === 1 ? " is" : "s are"} stuck or overloaded.`,
    );
  }
  if (coherence < 55) {
    blindSpots.push(
      "The OS is still storing more than it is connecting. Knowledge, reflection, and execution need stronger links.",
    );
  }
  if (blindSpots.length === 0) {
    blindSpots.push(
      "No major blind spot is obvious from the current data. Keep checking whether completed work maps to the highest-value project.",
    );
  }

  let hiddenPattern: string;
  if (completion >= 60 && load >= 70) {
    hiddenPattern =
      "You can keep executing under emotional load, but that can hide the cost until the system starts to fray.";
  } else if (completion >= 60 && focus < 55) {
    hiddenPattern =
      "Small wins may be substituting for aligned progress. The output is real, but some of it may be fake progress.";
  } else if (completion < 45 && load < 40) {
    hiddenPattern =
      "Low output and low emotional intensity could be recovery. It only becomes avoidance if important projects remain active and untouched.";
  } else if (coherence < 50) {
    hiddenPattern =
      "The bottleneck is not effort. The bottleneck is converting captured data into linked, actionable structure.";
  } else {
    hiddenPattern =
      "The strongest signal is usable momentum, but the system still needs one deliberate adjustment to prevent drift.";
  }

  let nextBestMove: string;
  if (context.projectMomentum.overloadedProjects > 0) {
    nextBestMove =
      "Pick one overloaded project and remove, defer, or renegotiate three tasks before adding anything new.";
  } else if (focus < 55) {
    nextBestMove =
      "Choose one project for the next 72 hours and define no more than three concrete outcomes.";
  } else if (coherence < 55) {
    nextBestMove =
      "Create three explicit links: one knowledge item to a project, one journal entry to a task, and one project to a goal.";
  } else {
    nextBestMove =
      "Protect the highest-moving project and schedule one uninterrupted execution block around it.";
  }

  const stopDoing =
    context.totals.overdueTasks > context.totals.completedTasks
      ? "Stop carrying stale tasks as invisible commitments. Delete, defer, or re-scope them."
      : focus < 55
        ? "Stop treating unrelated completions as proof of aligned progress."
        : "Stop adding new tracking surfaces before the current ones are connected.";

  const protect =
    strongest?.key === "emotional_load" && load >= 70
      ? "Protect recovery time. High load may be productive processing, but it still needs containment."
      : topDomain
        ? `Protect the ${topDomain.domain.toLowerCase()} signal while checking that ${quietDomain?.domain.toLowerCase()} is intentionally quiet.`
        : "Protect the one routine that is already producing measurable movement.";

  const confidence =
    context.totals.completedTasks +
      context.totals.journalEntries +
      context.brainHealth.totalNodes <
    8
      ? "low"
      : context.brainHealth.hasBrainData && context.emotionExecution.hasJournalData
        ? "high"
        : "medium";

  return {
    summary:
      weakest != null
        ? `${strongest?.label ?? "One signal"} is strongest; ${weakest.label} is the constraint. Read this as a directional mirror, not a verdict.`
        : "Not enough signal yet to form a useful reading.",
    progress,
    blindSpots,
    hiddenPattern,
    nextBestMove,
    stopDoing,
    protect,
    confidence,
  };
}
