import type { DailyPlanTask, FocusSessionType, FreePlanTask, Task } from "@/types/database";

export type PlannerTaskCategory =
  | "deep_work"
  | "admin"
  | "communication"
  | "meeting"
  | "learning"
  | "creative"
  | "recovery"
  | "health"
  | "personal"
  | "high_stimulation"
  | "unknown";

export type ClassifiablePlannerTask = {
  title: string;
  plannerTaskId: string | null;
  linkedTask?: Task | null;
  tags?: string[];
  quickTaskPresetKey?: string | null;
};

const CATEGORY_KEYWORDS: Record<Exclude<PlannerTaskCategory, "unknown">, string[]> = {
  recovery: [
    "break",
    "rest",
    "meditate",
    "meditation",
    "walk",
    "journal",
    "nap",
    "pause",
    "reset",
    "breathe",
    "breath",
    "冥想",
    "休息",
    "散步",
    "日记",
    "日記",
  ],
  health: [
    "gym",
    "workout",
    "exercise",
    "run",
    "sleep",
    "meal",
    "lunch",
    "dinner",
    "breakfast",
    "doctor",
    "yoga",
    "健康",
    "健身",
    "运动",
    "運動",
    "睡眠",
  ],
  communication: [
    "email",
    "message",
    "slack",
    "reply",
    "call",
    "dm",
    "inbox",
    "wechat",
    "telegram",
    "邮件",
    "郵件",
    "回复",
    "回覆",
  ],
  meeting: [
    "meeting",
    "standup",
    "sync",
    "interview",
    "1:1",
    "one-on-one",
    "review call",
    "会议",
    "會議",
    "面试",
    "面試",
  ],
  high_stimulation: [
    "youtube",
    "twitter",
    "x.com",
    "reddit",
    "tiktok",
    "shorts",
    "browse",
    "scroll",
    "radar",
    "feed",
    "doomscroll",
    "social",
    "YouTube",
    "微博",
    "小红书",
    "小紅書",
    "抖音",
  ],
  admin: [
    "invoice",
    "cleanup",
    "organize",
    "schedule",
    "errand",
    "tax",
    "pay",
    "renew",
    "file",
    "admin",
    "整理",
    "行政",
    "缴费",
    "繳費",
  ],
  learning: [
    "learn",
    "study",
    "read",
    "course",
    "lesson",
    "tutorial",
    "practice",
    "japanese",
    "language",
    "学习",
    "學習",
    "阅读",
    "閱讀",
    "日文",
  ],
  creative: [
    "write",
    "design",
    "compose",
    "draft",
    "sketch",
    "film",
    "record",
    "edit",
    "creative",
    "brand",
    "写",
    "寫",
    "设计",
    "設計",
    "创作",
    "創作",
  ],
  deep_work: [
    "build",
    "code",
    "implement",
    "strategy",
    "plan",
    "research",
    "analyze",
    "solve",
    "ship",
    "architecture",
    "debug",
    "开发",
    "開發",
    "研究",
    "分析",
  ],
  personal: [
    "family",
    "friend",
    "home",
    "personal",
    "date",
    "life admin",
    "家庭",
    "朋友",
    "个人",
    "個人",
  ],
};

const CATEGORY_PRIORITY: PlannerTaskCategory[] = [
  "high_stimulation",
  "meeting",
  "recovery",
  "health",
  "communication",
  "admin",
  "creative",
  "learning",
  "deep_work",
  "personal",
];

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function textScore(haystack: string, keywords: string[]): number {
  let score = 0;
  for (const keyword of keywords) {
    const k = normalizeText(keyword);
    if (k && haystack.includes(k)) score += k.length > 4 ? 2 : 1;
  }
  return score;
}

export function categoryToFocusSessionType(category: PlannerTaskCategory): FocusSessionType {
  switch (category) {
    case "admin":
    case "communication":
      return "admin";
    case "learning":
      return "learning";
    case "creative":
      return "creative";
    case "meeting":
      return "meeting";
    case "recovery":
    case "health":
      return "recovery";
    case "personal":
      return "personal";
    case "deep_work":
    case "high_stimulation":
    case "unknown":
      return "deep_work";
  }
}

export function isRecoveryCategory(category: PlannerTaskCategory): boolean {
  return category === "recovery" || category === "health" || category === "personal";
}

export function isDeepWorkCategory(category: PlannerTaskCategory): boolean {
  return category === "deep_work" || category === "creative" || category === "learning";
}

export function isHighStimulationCategory(category: PlannerTaskCategory): boolean {
  return category === "high_stimulation";
}

export function classifyTaskText(text: string): PlannerTaskCategory {
  const haystack = normalizeText(text);
  if (!haystack) return "unknown";
  let best: { category: PlannerTaskCategory; score: number } | null = null;
  for (const category of CATEGORY_PRIORITY) {
    if (category === "unknown") continue;
    const score = textScore(haystack, CATEGORY_KEYWORDS[category]);
    if (score > 0 && (!best || score > best.score)) {
      best = { category, score };
    }
  }
  return best?.category ?? "unknown";
}

export function classifyPlannerTask(input: ClassifiablePlannerTask): PlannerTaskCategory {
  const linked = input.linkedTask;
  const explicit = normalizeText(linked?.category);
  if (explicit) {
    const byExplicit = classifyTaskText(explicit);
    if (byExplicit !== "unknown") return byExplicit;
    if (explicit === "business" || explicit === "finance") return "admin";
    if (explicit === "music") return "creative";
    if (explicit === "academic") return "learning";
  }

  const tags = [...(input.tags ?? []), ...(linked?.tags ?? [])];
  const combined = [
    input.title,
    input.quickTaskPresetKey ?? "",
    linked?.title ?? "",
    linked?.description ?? "",
    linked?.source ?? "",
    linked?.project?.name ?? "",
    ...tags,
  ].join(" ");
  return classifyTaskText(combined);
}

export function classifiableFromDailyPlanTask(
  task: DailyPlanTask,
  linkedTasks: Task[],
): ClassifiablePlannerTask {
  const linkedTask = task.taskId
    ? linkedTasks.find((candidate) => candidate.id === task.taskId) ?? null
    : null;
  return {
    title: task.taskName ?? linkedTask?.title ?? "",
    plannerTaskId: task.plannerTaskId ?? null,
    linkedTask,
    tags: linkedTask?.tags ?? [],
  };
}

export function classifiableFromFreePlanTask(
  task: FreePlanTask,
  linkedTasks: Task[],
): ClassifiablePlannerTask {
  const linkedTask = task.taskId
    ? linkedTasks.find((candidate) => candidate.id === task.taskId) ?? null
    : null;
  return {
    title: task.title || linkedTask?.title || "",
    plannerTaskId: task.id,
    linkedTask,
    tags: linkedTask?.tags ?? [],
  };
}
