import type { BrainGraphData } from "@/lib/brain/compat";
import type { Goal, JapaneseStudySession, JournalEntry, Project, Task } from "@/types/database";
import { clamp, isDateInRange, percent, round } from "./date-range";
import type { AnalyticsRange, DomainKey, DomainRadar, DomainRadarPoint } from "./types";

const DOMAIN_LABELS: Record<DomainKey, string> = {
  execution: "Execution",
  career: "Career",
  knowledge: "Knowledge",
  health: "Health",
  finance: "Finance",
  relationships: "Relationships",
  creativity: "Creativity",
  reflection: "Reflection",
};

const DOMAIN_KEYWORDS: Record<Exclude<DomainKey, "execution" | "reflection">, string[]> = {
  career: ["career", "job", "work", "resume", "interview", "application", "offer"],
  knowledge: ["learn", "study", "knowledge", "research", "japanese", "course", "reading"],
  health: ["health", "sleep", "energy", "workout", "fitness", "body", "stress"],
  finance: ["finance", "money", "saving", "budget", "investment", "income", "expense"],
  relationships: ["relationship", "family", "friend", "partner", "people", "network"],
  creativity: ["creative", "write", "design", "music", "video", "art", "idea"],
};

function textForProject(project: Project): string {
  return [project.name, project.description, ...(project.tags ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function textForGoal(goal: Goal): string {
  return [goal.name, goal.description, goal.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function keywordCount(
  key: Exclude<DomainKey, "execution" | "reflection">,
  projects: Project[],
  goals: Goal[],
): number {
  const keywords = DOMAIN_KEYWORDS[key];
  const projectMatches = projects.filter((project) =>
    keywords.some((keyword) => textForProject(project).includes(keyword)),
  ).length;
  const goalMatches = goals.filter((goal) =>
    keywords.some((keyword) => textForGoal(goal).includes(keyword)),
  ).length;
  return projectMatches + goalMatches;
}

function brainCountForDomain(domain: DomainKey, brainGraph: BrainGraphData | null): number {
  if (!brainGraph) return 0;
  return brainGraph.nodes.filter((node) => {
    if (domain === "knowledge") {
      return node.type.startsWith("knowledge_") || node.type === "smart_tag";
    }
    if (domain === "health") return node.type === "health_goal";
    if (domain === "finance") return node.type === "finance_item";
    if (domain === "relationships") {
      return node.type === "relationship_person" || node.type === "role_model";
    }
    if (domain === "creativity") {
      return node.type === "idea" || node.type === "quote" || node.type === "decision";
    }
    if (domain === "career") {
      return node.type === "career_event" || node.type === "career_project";
    }
    if (domain === "reflection") {
      return node.type === "journal_entry" || node.type === "gratitude_entry";
    }
    return node.type === "task" || node.type === "project" || node.type === "goal";
  }).length;
}

function point(
  key: DomainKey,
  score: number,
  confidence: DomainRadarPoint["confidence"],
  signal: string,
): DomainRadarPoint {
  return {
    key,
    domain: DOMAIN_LABELS[key],
    score: round(clamp(score)),
    confidence,
    signal,
  };
}

export function computeDomainRadar(params: {
  range: AnalyticsRange;
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  journalEntries: JournalEntry[];
  studySessions: JapaneseStudySession[];
  brainGraph: BrainGraphData | null;
}): DomainRadar {
  const completed = params.tasks.filter(
    (task) =>
      task.status === "done" &&
      isDateInRange(task.completed_at, params.range.start, params.range.end),
  ).length;
  const dueOrCreated = params.tasks.filter(
    (task) =>
      isDateInRange(task.due_date, params.range.start, params.range.end) ||
      isDateInRange(task.created_at, params.range.start, params.range.end),
  ).length;
  const overdue = params.tasks.filter(
    (task) =>
      task.status !== "done" &&
      task.status !== "cancelled" &&
      task.due_date &&
      new Date(task.due_date) <= new Date(),
  ).length;
  const executionScore =
    percent(completed, Math.max(1, dueOrCreated)) * 0.65 +
    clamp(100 - overdue * 8) * 0.35;

  const activeProjects = params.projects.filter((project) => project.status === "active");
  const activeGoals = params.goals.filter((goal) => goal.status === "active");
  const studyMinutes = params.studySessions
    .filter((session) =>
      isDateInRange(session.session_date, params.range.start, params.range.end),
    )
    .reduce((sum, session) => sum + session.duration_minutes, 0);
  const journalInRange = params.journalEntries.filter((entry) =>
    isDateInRange(entry.entryDate, params.range.start, params.range.end),
  );
  const reflectionScore = clamp(
    percent(journalInRange.length, Math.max(1, Math.ceil(params.range.days / 4))) * 0.75 +
      percent(
        journalInRange.filter(
          (entry) => entry.projectIds.length > 0 || entry.taskIds.length > 0,
        ).length,
        Math.max(1, journalInRange.length),
      ) *
        0.25,
  );

  const points: DomainRadarPoint[] = [
    point(
      "execution",
      executionScore,
      dueOrCreated > 0 || completed > 0 ? "high" : "medium",
      `${completed} completed, ${overdue} overdue`,
    ),
    point(
      "career",
      clamp(keywordCount("career", activeProjects, activeGoals) * 22 + brainCountForDomain("career", params.brainGraph) * 6),
      keywordCount("career", activeProjects, activeGoals) > 0 ? "medium" : "low",
      `${keywordCount("career", activeProjects, activeGoals)} explicit career signals`,
    ),
    point(
      "knowledge",
      clamp(studyMinutes / Math.max(1, params.range.days * 20) * 75 + brainCountForDomain("knowledge", params.brainGraph) * 1.5),
      studyMinutes > 0 || brainCountForDomain("knowledge", params.brainGraph) > 0 ? "medium" : "low",
      `${Math.round(studyMinutes / 60)}h study plus Brain knowledge nodes`,
    ),
    point(
      "health",
      clamp(keywordCount("health", activeProjects, activeGoals) * 24 + brainCountForDomain("health", params.brainGraph) * 14),
      keywordCount("health", activeProjects, activeGoals) > 0 || brainCountForDomain("health", params.brainGraph) > 0 ? "medium" : "low",
      "Partial: health goals are visible; daily health logs are not wired here yet",
    ),
    point(
      "finance",
      clamp(keywordCount("finance", activeProjects, activeGoals) * 24 + brainCountForDomain("finance", params.brainGraph) * 8),
      keywordCount("finance", activeProjects, activeGoals) > 0 || brainCountForDomain("finance", params.brainGraph) > 0 ? "medium" : "low",
      "Partial: finance activity depends on linked goals and Brain nodes",
    ),
    point(
      "relationships",
      clamp(keywordCount("relationships", activeProjects, activeGoals) * 18 + brainCountForDomain("relationships", params.brainGraph) * 8),
      brainCountForDomain("relationships", params.brainGraph) > 0 ? "medium" : "low",
      `${brainCountForDomain("relationships", params.brainGraph)} people-related Brain nodes`,
    ),
    point(
      "creativity",
      clamp(keywordCount("creativity", activeProjects, activeGoals) * 18 + brainCountForDomain("creativity", params.brainGraph) * 4),
      keywordCount("creativity", activeProjects, activeGoals) > 0 || brainCountForDomain("creativity", params.brainGraph) > 0 ? "medium" : "low",
      "Ideas, creative projects, and related Brain nodes",
    ),
    point(
      "reflection",
      reflectionScore,
      journalInRange.length > 0 ? "high" : "low",
      `${journalInRange.length} journal entries in range`,
    ),
  ];

  const sorted = [...points].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const lowConfidence = points.filter((item) => item.confidence === "low").length;
  const interpretation =
    lowConfidence >= 4
      ? "This radar is partial. It shows where the OS has usable signals, not a complete judgment of your life balance."
      : `${top.domain} is carrying the most visible signal while ${bottom.domain} is quiet. Imbalance is only a problem if it is accidental.`;

  return { points, interpretation };
}
