import type { DailyPlan, JournalEntry, Task } from "@/types/database";
import {
  eachBucketInAnalyticsRange,
  getAnalyticsBucketGranularity,
  isDateInRange,
  round,
  toDayKey,
} from "./date-range";
import type {
  AnalyticsRange,
  EmotionExecution,
  EmotionExecutionBucket,
  EmotionQuadrant,
} from "./types";

function plannedItemCount(plan: DailyPlan): number {
  const timed = (plan.tasks ?? []).filter((task) => task.taskId || task.taskName).length;
  const free = (plan.free_tasks ?? []).filter((task) => task.title || task.taskId).length;
  return timed + free;
}

function dominantQuadrant(entries: JournalEntry[]): EmotionQuadrant | null {
  if (entries.length === 0) return null;
  const counts = entries.reduce(
    (acc, entry) => {
      acc[entry.quadrant] += 1;
      return acc;
    },
    { RED: 0, YELLOW: 0, BLUE: 0, GREEN: 0 } satisfies Record<EmotionQuadrant, number>,
  );
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    null) as EmotionQuadrant | null;
}

export function computeEmotionExecution(params: {
  range: AnalyticsRange;
  tasks: Task[];
  journalEntries: JournalEntry[];
  dailyPlans: DailyPlan[];
}): EmotionExecution {
  const granularity = getAnalyticsBucketGranularity(params.range);
  const buckets = eachBucketInAnalyticsRange(params.range).map<EmotionExecutionBucket>((bucket) => {
    const entries = params.journalEntries.filter((entry) =>
      isDateInRange(entry.entryDate, bucket.start, bucket.end),
    );
    const averageIntensity =
      entries.length === 0
        ? null
        : round(
            entries.reduce((sum, entry) => sum + entry.intensity, 0) /
              entries.length,
            1,
          );
    const completedTasks = params.tasks.filter(
      (task) =>
        task.status === "done" &&
        isDateInRange(task.completed_at, bucket.start, bucket.end),
    ).length;
    const plans = params.dailyPlans.filter((plan) =>
      isDateInRange(plan.plan_date, bucket.start, bucket.end),
    );
    const plannedItems = plans.reduce((sum, plan) => sum + plannedItemCount(plan), 0);
    const loadScore = averageIntensity == null ? 0 : Math.min(100, averageIntensity * 10);
    const executionScore = Math.min(100, completedTasks * 18 + plannedItems * 8);

    return {
      key: bucket.key,
      label: bucket.label,
      startISO: toDayKey(bucket.start),
      endISO: toDayKey(bucket.end),
      averageIntensity,
      dominantQuadrant: dominantQuadrant(entries),
      completedTasks,
      plannedItems,
      dailyPlanActive: plannedItems > 0,
      loadScore,
      executionScore,
    };
  });

  const bucketsWithJournal = buckets.filter((bucket) => bucket.averageIntensity != null);
  const bucketsWithExecution = buckets.filter(
    (bucket) => bucket.completedTasks > 0 || bucket.plannedItems > 0,
  );
  const highLoadBuckets = bucketsWithJournal.filter(
    (bucket) => (bucket.averageIntensity ?? 0) >= 7,
  );
  const highLoadExecution =
    highLoadBuckets.length === 0
      ? 0
      : highLoadBuckets.reduce((sum, bucket) => sum + bucket.executionScore, 0) /
        highLoadBuckets.length;
  const lowLoadBuckets = bucketsWithJournal.filter(
    (bucket) => (bucket.averageIntensity ?? 0) > 0 && (bucket.averageIntensity ?? 0) < 5,
  );
  const lowLoadExecution =
    lowLoadBuckets.length === 0
      ? 0
      : lowLoadBuckets.reduce((sum, bucket) => sum + bucket.executionScore, 0) /
        lowLoadBuckets.length;

  let interpretation: string;
  if (bucketsWithJournal.length === 0) {
    interpretation =
      "Journal entries unlock this pattern. Without emotional data, the page can show execution but not what it felt like.";
  } else if (bucketsWithExecution.length === 0) {
    interpretation =
      "Emotional data exists, but execution signals are quiet in this lens.";
  } else if (highLoadBuckets.length >= 2 && highLoadExecution < lowLoadExecution) {
    interpretation =
      "Higher emotional intensity appears to reduce execution. Treat this as a planning constraint, not a character issue.";
  } else if (highLoadBuckets.length > 0 && highLoadExecution >= lowLoadExecution) {
    interpretation =
      "High emotional intensity did not stop execution. Check whether those completions were meaningful or just pressure relief.";
  } else {
    interpretation =
      "Execution and emotional load are both present, but no strong correlation is visible yet.";
  }

  return {
    buckets,
    interpretation,
    hasJournalData: bucketsWithJournal.length > 0,
    hasExecutionData: bucketsWithExecution.length > 0,
    granularity,
  };
}
