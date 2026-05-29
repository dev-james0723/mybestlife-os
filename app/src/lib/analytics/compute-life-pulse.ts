import { format, isAfter, isBefore, startOfDay } from "date-fns";

import type { BrainGraphData } from "@/lib/brain/compat";
import type { BrainNodeType } from "@/types/brain-graph";
import type { DailyPlan, Goal, JapaneseStudySession, JournalEntry, Project, Task } from "@/types/database";
import {
  clamp,
  eachDayInAnalyticsRange,
  isDateInRange,
  parseAnyDate,
  percent,
  round,
  toDayKey,
} from "./date-range";
import type {
  AnalyticsRange,
  AnalyticsTotals,
  BrainDomainHealth,
  BrainHealth,
  LifePulseScore,
  MomentumWave,
  MomentumWavePoint,
  PulseTrendDirection,
} from "./types";

function plannedItemCount(plan: DailyPlan): number {
  const timed = (plan.tasks ?? []).filter((task) => task.taskId || task.taskName).length;
  const free = (plan.free_tasks ?? []).filter((task) => task.title || task.taskId).length;
  return timed + free;
}

function completedPlannedItemCount(
  plans: DailyPlan[],
  tasks: Task[],
  start: Date,
  end: Date,
): number {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  let count = 0;
  for (const plan of plans) {
    for (const item of plan.tasks ?? []) {
      if (!item.taskId) continue;
      const task = taskById.get(item.taskId);
      if (
        task?.status === "done" &&
        isDateInRange(task.completed_at, start, end)
      ) {
        count += 1;
      }
    }
    for (const item of plan.free_tasks ?? []) {
      if (item.priority === "done") count += 1;
      else if (item.taskId) {
        const task = taskById.get(item.taskId);
        if (
          task?.status === "done" &&
          isDateInRange(task.completed_at, start, end)
        ) {
          count += 1;
        }
      }
    }
  }
  return count;
}

function taskIsOpen(task: Task): boolean {
  return task.status !== "done" && task.status !== "cancelled";
}

function completedTasksInRange(tasks: Task[], start: Date, end: Date): Task[] {
  return tasks.filter(
    (task) => task.status === "done" && isDateInRange(task.completed_at, start, end),
  );
}

function overdueTasks(tasks: Task[], now = new Date()): Task[] {
  return tasks.filter((task) => {
    const due = parseAnyDate(task.due_date);
    return taskIsOpen(task) && due != null && isBefore(due, now);
  });
}

function activeProjects(projects: Project[]): Project[] {
  return projects.filter((project) => project.status === "active");
}

function trend(current: number, previous: number): {
  direction: PulseTrendDirection;
  value: number;
  label: string;
} {
  const diff = round(current - previous);
  const direction: PulseTrendDirection =
    Math.abs(diff) < 3 ? "steady" : diff > 0 ? "up" : "down";
  return {
    direction,
    value: diff,
    label:
      direction === "steady"
        ? "stable vs previous lens"
        : `${diff > 0 ? "+" : ""}${diff} vs previous lens`,
  };
}

function nodeDomain(type: BrainNodeType): string {
  if (type === "task" || type === "project" || type === "goal" || type === "daily_plan") {
    return "Execution";
  }
  if (type.startsWith("knowledge_") || type === "smart_tag") return "Knowledge";
  if (type === "journal_entry" || type === "gratitude_entry" || type === "about_me") {
    return "Reflection";
  }
  if (type === "career_event" || type === "career_project") return "Career";
  if (type === "health_goal") return "Health";
  if (type === "finance_item") return "Finance";
  if (type === "relationship_person" || type === "role_model" || type === "organization") {
    return "Relationships";
  }
  if (type === "idea" || type === "quote" || type === "decision") return "Creativity";
  if (type === "habit" || type === "workflow" || type === "tool") return "Systems";
  return "Other";
}

function edgeConnectsTypes(
  graph: BrainGraphData | null,
  a: BrainNodeType,
  b: BrainNodeType,
): boolean {
  if (!graph) return false;
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  return graph.edges.some((edge) => {
    const source = byId.get(edge.sourceNodeId);
    const target = byId.get(edge.targetNodeId);
    if (!source || !target) return false;
    return (
      (source.type === a && target.type === b) ||
      (source.type === b && target.type === a)
    );
  });
}

function uniqueProjectsLinkedToGoals(graph: BrainGraphData | null): Set<string> {
  const linked = new Set<string>();
  if (!graph) return linked;
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const edge of graph.edges) {
    const source = byId.get(edge.sourceNodeId);
    const target = byId.get(edge.targetNodeId);
    if (!source || !target) continue;
    if (source.type === "project" && target.type === "goal" && source.sourceId) {
      linked.add(source.sourceId);
    }
    if (target.type === "project" && source.type === "goal" && target.sourceId) {
      linked.add(target.sourceId);
    }
  }
  return linked;
}

function dailyPlanFocusThemeScore(dailyPlans: DailyPlan[]): number {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "task",
    "work",
    "todo",
    "plan",
    "a",
    "to",
    "of",
    "in",
    "on",
  ]);
  const counts = new Map<string, number>();
  let total = 0;
  for (const plan of dailyPlans) {
    const labels = [
      ...(plan.tasks ?? []).map((task) => task.taskName ?? ""),
      ...(plan.free_tasks ?? []).map((task) => task.title ?? ""),
    ];
    for (const label of labels) {
      for (const token of label.toLowerCase().split(/[^a-z0-9]+/)) {
        if (token.length < 3 || stopWords.has(token)) continue;
        counts.set(token, (counts.get(token) ?? 0) + 1);
        total += 1;
      }
    }
  }
  if (total === 0) return 45;
  const top = Math.max(...counts.values());
  return clamp(35 + (top / total) * 100);
}

function distributionFocusScore(tasks: Task[]): number {
  const linked = tasks.filter((task) => task.project_id);
  if (linked.length <= 1) return linked.length === 1 ? 80 : 45;
  const byProject = new Map<string, number>();
  for (const task of linked) {
    if (!task.project_id) continue;
    byProject.set(task.project_id, (byProject.get(task.project_id) ?? 0) + 1);
  }
  const shares = [...byProject.values()].map((count) => count / linked.length);
  const herfindahl = shares.reduce((sum, share) => sum + share * share, 0);
  return clamp(45 + herfindahl * 55);
}

function activeProjectLoadScore(projects: Project[]): number {
  const count = activeProjects(projects).length;
  if (count === 0) return 45;
  if (count >= 2 && count <= 5) return 100;
  if (count === 1) return 82;
  return clamp(100 - (count - 5) * 9, 35, 100);
}

function computeCompletionScore(params: {
  range: AnalyticsRange;
  tasks: Task[];
  projects: Project[];
  studySessions: JapaneseStudySession[];
  dailyPlans: DailyPlan[];
  start: Date;
  end: Date;
}): number {
  const completed = completedTasksInRange(params.tasks, params.start, params.end).length;
  const plansInRange = params.dailyPlans.filter((plan) =>
    isDateInRange(plan.plan_date, params.start, params.end),
  );
  const plannedItems = plansInRange.reduce((sum, plan) => sum + plannedItemCount(plan), 0);
  const completedPlanned = completedPlannedItemCount(
    plansInRange,
    params.tasks,
    params.start,
    params.end,
  );
  const studyMinutes = params.studySessions
    .filter((session) => isDateInRange(session.session_date, params.start, params.end))
    .reduce((sum, session) => sum + session.duration_minutes, 0);
  const activeProjectIds = new Set(activeProjects(params.projects).map((project) => project.id));
  const activeProjectsWithActivity = new Set(
    params.tasks
      .filter(
        (task) =>
          task.project_id &&
          activeProjectIds.has(task.project_id) &&
          (isDateInRange(task.completed_at, params.start, params.end) ||
            isDateInRange(task.updated_at, params.start, params.end)),
      )
      .map((task) => task.project_id),
  ).size;
  const overduePenalty = Math.min(28, overdueTasks(params.tasks).length * 4);

  const completedTaskScore = clamp((completed / Math.max(1, params.range.days * 1.4)) * 100);
  const dailyPlanCompletionScore =
    plannedItems > 0 ? percent(completedPlanned, plannedItems) : plansInRange.length > 0 ? 45 : 25;
  const studyConsistencyScore = clamp((studyMinutes / Math.max(1, params.range.days * 25)) * 100);
  const projectActivityScore = activeProjectIds.size
    ? percent(activeProjectsWithActivity, activeProjectIds.size)
    : 45;

  return clamp(
    completedTaskScore * 0.4 +
      dailyPlanCompletionScore * 0.25 +
      studyConsistencyScore * 0.15 +
      projectActivityScore * 0.2 -
      overduePenalty,
  );
}

function computeFocusScore(params: {
  rangeTasks: Task[];
  projects: Project[];
  brainGraph: BrainGraphData | null;
  dailyPlans: DailyPlan[];
}): number {
  const linkedTaskRatio = percent(
    params.rangeTasks.filter((task) => task.project_id).length,
    params.rangeTasks.length,
  );
  const active = activeProjects(params.projects);
  const projectGoalLinks = uniqueProjectsLinkedToGoals(params.brainGraph);
  const projectGoalLinkRatio = active.length
    ? percent(active.filter((project) => projectGoalLinks.has(project.id)).length, active.length)
    : 45;
  return clamp(
    linkedTaskRatio * 0.35 +
      projectGoalLinkRatio * 0.25 +
      activeProjectLoadScore(params.projects) * 0.2 +
      distributionFocusScore(params.rangeTasks) * 0.1 +
      dailyPlanFocusThemeScore(params.dailyPlans) * 0.1,
  );
}

function computeEmotionalLoadScore(entries: JournalEntry[], rangeDays: number): number {
  if (entries.length === 0) return 20;
  const averageIntensity =
    entries.reduce((sum, entry) => sum + entry.intensity, 0) / entries.length;
  const highIntensityRate = percent(
    entries.filter((entry) => entry.intensity >= 7).length,
    entries.length,
  );
  const pressureQuadrantRate = percent(
    entries.filter((entry) => entry.quadrant === "RED" || entry.quadrant === "BLUE").length,
    entries.length,
  );
  const journalFrequency = percent(entries.length, Math.max(1, Math.ceil(rangeDays / 3)));
  return clamp(
    averageIntensity * 8 +
      highIntensityRate * 0.2 +
      pressureQuadrantRate * 0.18 +
      journalFrequency * 0.12,
  );
}

function computeSystemCoherenceScore(params: {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  journalEntries: JournalEntry[];
  brainGraph: BrainGraphData | null;
  brainHealth: BrainHealth;
}): number {
  const projectTaskLinkage = percent(
    params.tasks.filter((task) => task.project_id).length,
    params.tasks.length,
  );
  const active = activeProjects(params.projects);
  const projectGoalLinks = uniqueProjectsLinkedToGoals(params.brainGraph);
  const goalProjectLinkage = active.length
    ? percent(active.filter((project) => projectGoalLinks.has(project.id)).length, active.length)
    : params.goals.length > 0
      ? 35
      : 50;
  const journalLinkage = percent(
    params.journalEntries.filter(
      (entry) => entry.projectIds.length > 0 || entry.taskIds.length > 0,
    ).length,
    params.journalEntries.length,
  );
  const brainDensity = params.brainHealth.hasBrainData
    ? clamp((1 - params.brainHealth.orphanRate) * 100) * 0.55 +
      clamp(params.brainHealth.averageDegree * 18) * 0.45
    : 35;
  const knowledgeProjectSignal = edgeConnectsTypes(
    params.brainGraph,
    "knowledge_card",
    "project",
  )
    ? 100
    : 35;
  return clamp(
    brainDensity * 0.3 +
      projectTaskLinkage * 0.22 +
      goalProjectLinkage * 0.18 +
      knowledgeProjectSignal * 0.15 +
      journalLinkage * 0.15,
  );
}

export function computeBrainHealth(graph: BrainGraphData | null): BrainHealth {
  if (!graph || graph.nodes.length === 0) {
    return {
      totalNodes: 0,
      totalEdges: 0,
      orphanRate: 0,
      orphanCount: 0,
      averageDegree: 0,
      isolatedDomains: [],
      topConnectedDomains: [],
      suggestedMissingConnections: [
        "Add knowledge, projects, tasks, and journals to let the Brain graph form cross-domain links.",
      ],
      interpretation:
        "Brain data is not available yet, so coherence is estimated from direct task and project links.",
      hasBrainData: false,
    };
  }

  const degreeByNode = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) {
    degreeByNode.set(edge.sourceNodeId, (degreeByNode.get(edge.sourceNodeId) ?? 0) + 1);
    degreeByNode.set(edge.targetNodeId, (degreeByNode.get(edge.targetNodeId) ?? 0) + 1);
  }
  const orphanCount = [...degreeByNode.values()].filter((degree) => degree === 0).length;
  const domainStats = new Map<string, BrainDomainHealth>();
  for (const node of graph.nodes) {
    const domain = nodeDomain(node.type);
    const current = domainStats.get(domain) ?? { domain, nodes: 0, degree: 0 };
    current.nodes += 1;
    current.degree += degreeByNode.get(node.id) ?? 0;
    domainStats.set(domain, current);
  }

  const isolatedDomains = [...domainStats.values()]
    .filter((domain) => domain.nodes > 0 && domain.degree === 0)
    .map((domain) => domain.domain)
    .sort();
  const topConnectedDomains = [...domainStats.values()]
    .filter((domain) => domain.degree > 0)
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 4);

  const suggestions: string[] = [];
  if (!edgeConnectsTypes(graph, "knowledge_card", "project")) {
    suggestions.push("Connect at least one knowledge item to a project so learning can convert into execution.");
  }
  if (!edgeConnectsTypes(graph, "journal_entry", "project")) {
    suggestions.push("Link a journal entry to the project or task it affected.");
  }
  if (!edgeConnectsTypes(graph, "goal", "project")) {
    suggestions.push("Attach active projects to goals so the system can distinguish progress from activity.");
  }

  const orphanRate = orphanCount / graph.nodes.length;
  const averageDegree = graph.nodes.length === 0 ? 0 : (graph.edges.length * 2) / graph.nodes.length;
  const interpretation =
    orphanRate > 0.4
      ? `The Brain is accumulating data, but ${round(orphanRate * 100)}% of nodes are isolated. Connection quality is the bottleneck.`
      : averageDegree >= 2
        ? "The Brain is becoming connected enough to reveal cross-domain patterns, not only record storage."
        : "The Brain has connections, but the graph is still sparse. Add explicit links where work, learning, and reflection meet.";

  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    orphanRate,
    orphanCount,
    averageDegree: round(averageDegree, 1),
    isolatedDomains,
    topConnectedDomains,
    suggestedMissingConnections: suggestions.slice(0, 3),
    interpretation,
    hasBrainData: true,
  };
}

export function computeMomentumWave(params: {
  range: AnalyticsRange;
  tasks: Task[];
  studySessions: JapaneseStudySession[];
  journalEntries: JournalEntry[];
  dailyPlans: DailyPlan[];
}): MomentumWave {
  const points = eachDayInAnalyticsRange(params.range).map<MomentumWavePoint>((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const completedTasks = params.tasks.filter(
      (task) =>
        task.status === "done" &&
        isDateInRange(task.completed_at, dayStart, dayEnd),
    ).length;
    const plannedItems = params.dailyPlans
      .filter((plan) => isDateInRange(plan.plan_date, dayStart, dayEnd))
      .reduce((sum, plan) => sum + plannedItemCount(plan), 0);
    const overduePressure = params.tasks.filter((task) => {
      const due = parseAnyDate(task.due_date);
      return (
        taskIsOpen(task) &&
        due != null &&
        !isAfter(due, dayEnd) &&
        isBefore(due, new Date())
      );
    }).length;
    const studyMinutes = params.studySessions
      .filter((session) => isDateInRange(session.session_date, dayStart, dayEnd))
      .reduce((sum, session) => sum + session.duration_minutes, 0);
    const journals = params.journalEntries.filter((entry) =>
      isDateInRange(entry.entryDate, dayStart, dayEnd),
    );
    const journalIntensity =
      journals.length === 0
        ? null
        : round(journals.reduce((sum, entry) => sum + entry.intensity, 0) / journals.length, 1);
    const studyBlocks = round(studyMinutes / 30, 1);
    return {
      date: toDayKey(day),
      label: format(day, params.range.days <= 14 ? "EEE" : "MMM d"),
      completedTasks,
      plannedItems,
      overduePressure,
      studyMinutes,
      studyBlocks,
      journalIntensity,
      activityScore: round(
        completedTasks * 16 +
          plannedItems * 6 +
          studyBlocks * 7 +
          (journalIntensity ?? 0) * 2 -
          overduePressure * 3,
      ),
    };
  });

  const totalCompleted = points.reduce((sum, point) => sum + point.completedTasks, 0);
  const totalOverduePressure = points.reduce((sum, point) => sum + point.overduePressure, 0);
  const highIntensityDays = points.filter((point) => (point.journalIntensity ?? 0) >= 7).length;
  const hasData = points.some(
    (point) =>
      point.completedTasks > 0 ||
      point.plannedItems > 0 ||
      point.studyMinutes > 0 ||
      point.journalIntensity != null,
  );
  const interpretation =
    !hasData
      ? "This lens has no activity yet. Tasks, plans, study sessions, or journal entries will create the wave."
      : totalOverduePressure > totalCompleted * 1.8
        ? "Overdue pressure is rising faster than completion. That usually means the system needs pruning before more effort."
        : highIntensityDays > 0 && totalCompleted > 0
          ? "Execution continued through emotional intensity. Check whether the work was meaningful progress or pressure relief."
          : totalCompleted > 0
            ? "The wave shows real movement without a strong overload signal in this range."
            : "Planning or reflection exists, but task completion is quiet in this range.";

  return { points, interpretation, hasData };
}

export function computeLifePulse(params: {
  range: AnalyticsRange;
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  journalEntries: JournalEntry[];
  studySessions: JapaneseStudySession[];
  dailyPlans: DailyPlan[];
  brainGraph: BrainGraphData | null;
}): {
  pulseScores: LifePulseScore[];
  totals: AnalyticsTotals;
  momentumWave: MomentumWave;
  brainHealth: BrainHealth;
  statusSummary: string;
} {
  const rangeTasks = params.tasks.filter(
    (task) =>
      isDateInRange(task.created_at, params.range.start, params.range.end) ||
      isDateInRange(task.due_date, params.range.start, params.range.end) ||
      isDateInRange(task.completed_at, params.range.start, params.range.end) ||
      isDateInRange(task.updated_at, params.range.start, params.range.end),
  );
  const rangeJournals = params.journalEntries.filter((entry) =>
    isDateInRange(entry.entryDate, params.range.start, params.range.end),
  );
  const plansInRange = params.dailyPlans.filter((plan) =>
    isDateInRange(plan.plan_date, params.range.start, params.range.end),
  );
  const completed = completedTasksInRange(params.tasks, params.range.start, params.range.end).length;
  const previousCompleted = completedTasksInRange(
    params.tasks,
    params.range.previousStart,
    params.range.previousEnd,
  ).length;
  const plannedItems = plansInRange.reduce((sum, plan) => sum + plannedItemCount(plan), 0);
  const studyMinutes = params.studySessions
    .filter((session) => isDateInRange(session.session_date, params.range.start, params.range.end))
    .reduce((sum, session) => sum + session.duration_minutes, 0);
  const currentOverdue = overdueTasks(params.tasks).length;
  const linkedTaskRatio = percent(
    params.tasks.filter((task) => task.project_id).length,
    params.tasks.length,
  );
  const projectGoalLinks = uniqueProjectsLinkedToGoals(params.brainGraph);
  const active = activeProjects(params.projects);
  const projectGoalLinkRatio = active.length
    ? percent(active.filter((project) => projectGoalLinks.has(project.id)).length, active.length)
    : 0;

  const brainHealth = computeBrainHealth(params.brainGraph);
  const completionScore = computeCompletionScore({
    ...params,
    start: params.range.start,
    end: params.range.end,
  });
  const previousCompletionScore = computeCompletionScore({
    ...params,
    start: params.range.previousStart,
    end: params.range.previousEnd,
  });
  const focusScore = computeFocusScore({
    rangeTasks,
    projects: params.projects,
    brainGraph: params.brainGraph,
    dailyPlans: plansInRange,
  });
  const previousRangeTasks = params.tasks.filter(
    (task) =>
      isDateInRange(task.created_at, params.range.previousStart, params.range.previousEnd) ||
      isDateInRange(task.due_date, params.range.previousStart, params.range.previousEnd) ||
      isDateInRange(task.completed_at, params.range.previousStart, params.range.previousEnd),
  );
  const previousFocusScore = computeFocusScore({
    rangeTasks: previousRangeTasks,
    projects: params.projects,
    brainGraph: params.brainGraph,
    dailyPlans: params.dailyPlans.filter((plan) =>
      isDateInRange(plan.plan_date, params.range.previousStart, params.range.previousEnd),
    ),
  });
  const emotionalLoad = computeEmotionalLoadScore(rangeJournals, params.range.days);
  const previousEmotionalLoad = computeEmotionalLoadScore(
    params.journalEntries.filter((entry) =>
      isDateInRange(entry.entryDate, params.range.previousStart, params.range.previousEnd),
    ),
    params.range.days,
  );
  const systemCoherence = computeSystemCoherenceScore({
    tasks: params.tasks,
    projects: params.projects,
    goals: params.goals,
    journalEntries: params.journalEntries,
    brainGraph: params.brainGraph,
    brainHealth,
  });
  const previousSystemCoherence = systemCoherence;

  const completionTrend = trend(completionScore, previousCompletionScore);
  const focusTrend = trend(focusScore, previousFocusScore);
  const loadTrend = trend(emotionalLoad, previousEmotionalLoad);
  const coherenceTrend = trend(systemCoherence, previousSystemCoherence);

  const pulseScores: LifePulseScore[] = [
    {
      key: "completion_momentum",
      label: "Completion Momentum",
      score: round(completionScore),
      trend: completionTrend.direction,
      trendValue: completionTrend.value,
      trendLabel: completionTrend.label,
      signal: `${completed} completed · ${plannedItems} planned · ${currentOverdue} overdue`,
      interpretation:
        completionScore >= 70
          ? "Execution is producing visible movement."
          : currentOverdue > completed
            ? "Overdue pressure is muting the progress signal."
            : "Movement exists, but it is not yet strong enough to call momentum.",
      tone: completionScore >= 65 ? "positive" : currentOverdue > completed ? "watch" : "neutral",
    },
    {
      key: "focus_consistency",
      label: "Focus Consistency",
      score: round(focusScore),
      trend: focusTrend.direction,
      trendValue: focusTrend.value,
      trendLabel: focusTrend.label,
      signal: `${round(linkedTaskRatio)}% tasks linked · ${active.length} active projects`,
      interpretation:
        focusScore >= 70
          ? "Work is mostly attached to a coherent direction."
          : active.length > 6
            ? "Too many active projects are competing for attention."
            : "Some activity is still floating outside project or goal structure.",
      tone: focusScore >= 65 ? "positive" : "watch",
    },
    {
      key: "emotional_load",
      label: "Emotional Load",
      score: round(emotionalLoad),
      trend: loadTrend.direction,
      trendValue: loadTrend.value,
      trendLabel: loadTrend.label,
      signal: `${rangeJournals.length} journals · ${round(
        rangeJournals.reduce((sum, entry) => sum + entry.intensity, 0) /
          Math.max(1, rangeJournals.length),
        1,
      )}/10 avg intensity`,
      interpretation:
        rangeJournals.length === 0
          ? "Emotional data is limited; this score is conservative."
          : emotionalLoad >= 70
            ? "Load is high. That can mean pressure, or meaningful processing."
            : emotionalLoad >= 45
              ? "There is emotional signal without clear overload."
              : "Emotional load looks light in this lens.",
      tone: emotionalLoad >= 70 ? "load" : emotionalLoad >= 45 ? "neutral" : "positive",
    },
    {
      key: "system_coherence",
      label: "System Coherence",
      score: round(systemCoherence),
      trend: coherenceTrend.direction,
      trendValue: coherenceTrend.value,
      trendLabel: coherenceTrend.label,
      signal: `${brainHealth.totalNodes} nodes · ${round(brainHealth.orphanRate * 100)}% orphan rate`,
      interpretation:
        systemCoherence >= 70
          ? "The OS is connecting action, knowledge, and reflection."
          : brainHealth.orphanRate > 0.4
            ? "Data is accumulating faster than relationships are forming."
            : "Structure exists, but the graph is not yet strongly connected.",
      tone: systemCoherence >= 65 ? "positive" : "watch",
    },
  ];

  let statusSummary: string;
  if (completionScore >= 65 && focusScore < 55) {
    statusSummary =
      "You are moving, but not fully aligned. Execution improved while focus remains scattered.";
  } else if (completionScore >= 65 && emotionalLoad >= 70) {
    statusSummary =
      "You are progressing under pressure. The work is moving, but the emotional cost deserves attention.";
  } else if (completionScore < 45 && emotionalLoad < 40) {
    statusSummary =
      "The system is quiet. This may be real recovery, or drift if important projects are still open.";
  } else if (systemCoherence < 50) {
    statusSummary =
      "Your Life OS is collecting data faster than it is connecting it. The next gain is structural, not just effort.";
  } else {
    statusSummary =
      "You have usable momentum. The next adjustment is to protect what is working and remove one source of drag.";
  }

  return {
    pulseScores,
    totals: {
      completedTasks: completed,
      completedTasksPrevious: previousCompleted,
      plannedItems,
      overdueTasks: currentOverdue,
      studyMinutes,
      journalEntries: rangeJournals.length,
      activeProjects: active.length,
      activeGoals: params.goals.filter((goal) => goal.status === "active").length,
      linkedTaskRatio,
      projectGoalLinkRatio,
    },
    momentumWave: computeMomentumWave(params),
    brainHealth,
    statusSummary,
  };
}
