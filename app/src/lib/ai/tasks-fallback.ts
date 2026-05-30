/**
 * Deterministic, rule-based fallbacks for every `/api/ai/tasks` mode. These run
 * whenever no Gemini key is configured or a model call fails — the feature must
 * still return real, useful output (not a stub). Pure + unit-testable.
 */
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { deriveTaskCategory } from "@/lib/tasks/task-categories";
import type { TaskLite } from "@/lib/ai/prompts/tasks";
import type {
  TaskBreakdownAiResult,
  TaskCleanupAiResult,
  TaskCreateAiResult,
  TaskPrioritizeAiResult,
  TaskReviewAiResult,
  TaskScheduleAiResult,
} from "@/lib/ai/schemas/tasks";

export type FallbackLocale = string;

function tr(
  locale: FallbackLocale,
  variants: { en: string; zhTW: string; zhCN: string },
): string {
  if (locale === "zh-TW") return variants.zhTW;
  if (locale === "zh-CN") return variants.zhCN;
  return variants.en;
}

const URGENT = ["urgent", "asap", "immediately", "緊急", "紧急", "马上", "馬上"];
const HIGH = ["important", "priority", "deadline", "重要", "優先", "优先", "截止"];
const QUICK = ["quick", "small", "短", "快", "簡單", "简单"];
const DEEP = ["deep", "research", "design", "build", "write", "深", "研究"];

function priorityFromText(text: string): TaskCreateAiResult["priority"] {
  const t = text.toLowerCase();
  if (URGENT.some((h) => t.includes(h))) return "urgent";
  if (HIGH.some((h) => t.includes(h))) return "high";
  return "medium";
}

function blocksFromText(text: string): number {
  const t = text.toLowerCase();
  if (DEEP.some((h) => t.includes(h))) return 4;
  if (QUICK.some((h) => t.includes(h))) return 1;
  return 2;
}

export function fallbackCreate(
  prompt: string,
  locale: FallbackLocale,
): TaskCreateAiResult {
  const trimmed = prompt.trim();
  const firstLine = trimmed.split(/\r?\n/)[0]?.trim() ?? trimmed;
  const title = (
    firstLine.replace(/[.。]\s*$/, "") || trimmed
  ).slice(0, 200);
  const hasBody = trimmed.length > title.length + 4;
  const category = deriveTaskCategory({ tags: [], source: null, title: trimmed });

  return {
    title,
    description: hasBody ? trimmed.slice(0, 2000) : "",
    priority: priorityFromText(trimmed),
    status: "todo",
    category: category ?? "",
    estimatedBlocks: blocksFromText(trimmed),
    dueDate: "",
    scheduledDate: "",
    tags: [],
    reminders: [
      tr(locale, {
        en: "Clarify the goal before you start.",
        zhTW: "開始前先釐清目標。",
        zhCN: "开始前先厘清目标。",
      }),
    ],
    subtasks: [],
  };
}

export function fallbackBreakdown(
  title: string,
  locale: FallbackLocale,
): TaskBreakdownAiResult {
  const steps = [
    tr(locale, {
      en: "Clarify the goal and scope",
      zhTW: "釐清目標與範圍",
      zhCN: "厘清目标与范围",
    }),
    tr(locale, {
      en: "Gather what you need",
      zhTW: "準備所需資源",
      zhCN: "准备所需资源",
    }),
    tr(locale, {
      en: "Do the main work",
      zhTW: "完成主要工作",
      zhCN: "完成主要工作",
    }),
    tr(locale, {
      en: "Review and finalize",
      zhTW: "檢查並收尾",
      zhCN: "检查并收尾",
    }),
  ];
  return {
    subtasks: steps,
    summary: tr(locale, {
      en: `A simple 4-step plan for "${title.slice(0, 40)}".`,
      zhTW: `「${title.slice(0, 40)}」的四步計畫。`,
      zhCN: `「${title.slice(0, 40)}」的四步计划。`,
    }),
  };
}

/** Days until due (negative = overdue); null when no due date. */
function daysUntilDue(due: string | null | undefined, today: Date): number | null {
  if (!due) return null;
  try {
    return differenceInCalendarDays(parseISO(due), startOfDay(today));
  } catch {
    return null;
  }
}

export function fallbackPrioritize(
  tasks: TaskLite[],
  today: Date,
  locale: FallbackLocale,
): TaskPrioritizeAiResult {
  const items = tasks.map((t) => {
    const d = daysUntilDue(t.dueDate, today);
    let priority: TaskPrioritizeAiResult["items"][number]["priority"];
    let reason: string;
    if (d != null && d < 0) {
      priority = "urgent";
      reason = tr(locale, { en: "Overdue.", zhTW: "已逾期。", zhCN: "已逾期。" });
    } else if (d != null && d === 0) {
      priority = "urgent";
      reason = tr(locale, { en: "Due today.", zhTW: "今天到期。", zhCN: "今天到期。" });
    } else if (d != null && d <= 3) {
      priority = "high";
      reason = tr(locale, {
        en: "Due within 3 days.",
        zhTW: "三天內到期。",
        zhCN: "三天内到期。",
      });
    } else if (d != null && d <= 7) {
      priority = "medium";
      reason = tr(locale, {
        en: "Due this week.",
        zhTW: "本週到期。",
        zhCN: "本周到期。",
      });
    } else {
      priority = (t.priority as TaskPrioritizeAiResult["items"][number]["priority"]) ?? "low";
      if (!["low", "medium", "high", "urgent"].includes(priority)) priority = "low";
      reason = tr(locale, {
        en: "No near deadline.",
        zhTW: "近期無截止。",
        zhCN: "近期无截止。",
      });
    }
    return { id: t.id, priority, reason };
  });
  return { items, summary: "" };
}

export function fallbackSchedule(
  tasks: TaskLite[],
  today: Date,
  locale: FallbackLocale,
): TaskScheduleAiResult {
  // Spread tasks across upcoming days, earliest for soonest deadlines.
  const order = [...tasks].sort((a, b) => {
    const da = daysUntilDue(a.dueDate, today) ?? 9999;
    const db = daysUntilDue(b.dueDate, today) ?? 9999;
    return da - db;
  });
  const items = order.map((t, i) => {
    const due = daysUntilDue(t.dueDate, today);
    // 2 tasks per day, but never after the due date.
    let offset = Math.floor(i / 2);
    if (due != null && due >= 0 && offset > due) offset = due;
    const date = format(addDays(startOfDay(today), Math.max(0, offset)), "yyyy-MM-dd");
    return {
      id: t.id,
      scheduledDate: date,
      dueDate: t.dueDate ?? "",
      reason: tr(locale, {
        en: "Spread to balance the load.",
        zhTW: "分散安排以平衡工作量。",
        zhCN: "分散安排以平衡工作量。",
      }),
    };
  });
  return { items, summary: "" };
}

export function fallbackCleanup(
  tasks: TaskLite[],
  today: Date,
  locale: FallbackLocale,
): TaskCleanupAiResult {
  const suggestions: TaskCleanupAiResult["suggestions"] = [];
  const seenTitles = new Map<string, string>();

  for (const t of tasks) {
    const key = t.title.trim().toLowerCase();
    // Duplicate titles -> delete the later one.
    if (key && seenTitles.has(key)) {
      suggestions.push({
        id: t.id,
        action: "delete",
        reason: tr(locale, {
          en: "Duplicate of another task.",
          zhTW: "與其他任務重複。",
          zhCN: "与其他任务重复。",
        }),
        newTitle: "",
      });
      continue;
    }
    if (key) seenTitles.set(key, t.id);

    // Stale: untouched > 30 days and still open.
    const updated = t.updatedAt ? daysUntilDue(t.updatedAt, today) : null;
    if (
      updated != null &&
      updated < -30 &&
      t.status !== "done" &&
      t.status !== "cancelled"
    ) {
      suggestions.push({
        id: t.id,
        action: "archive",
        reason: tr(locale, {
          en: "No activity in over a month.",
          zhTW: "超過一個月沒有更新。",
          zhCN: "超过一个月没有更新。",
        }),
        newTitle: "",
      });
      continue;
    }

    // Vague single-word title -> suggest rewording.
    if (key && key.split(/\s+/).length <= 1 && key.length <= 4) {
      suggestions.push({
        id: t.id,
        action: "reword",
        reason: tr(locale, {
          en: "Title is too vague.",
          zhTW: "標題過於含糊。",
          zhCN: "标题过于含糊。",
        }),
        newTitle: "",
      });
    }
  }
  return { suggestions: suggestions.slice(0, 30), summary: "" };
}

export type ReviewMetrics = {
  total: number;
  active: number;
  inProgress: number;
  completedThisWeek: number;
  overdue: number;
  dueToday: number;
  noProject: number;
  highUrgent: number;
};

export function fallbackReview(
  mode: "weekly-review" | "summary",
  m: ReviewMetrics,
  locale: FallbackLocale,
): TaskReviewAiResult {
  const headline =
    mode === "weekly-review"
      ? tr(locale, {
          en: `You completed ${m.completedThisWeek} task(s) this week with ${m.active} still active.`,
          zhTW: `本週完成 ${m.completedThisWeek} 項任務，仍有 ${m.active} 項進行中。`,
          zhCN: `本周完成 ${m.completedThisWeek} 项任务，仍有 ${m.active} 项进行中。`,
        })
      : tr(locale, {
          en: `${m.active} active task(s), ${m.overdue} overdue, ${m.dueToday} due today.`,
          zhTW: `${m.active} 項進行中，${m.overdue} 項逾期，${m.dueToday} 項今天到期。`,
          zhCN: `${m.active} 项进行中，${m.overdue} 项逾期，${m.dueToday} 项今天到期。`,
        });

  const wins: string[] = [];
  if (m.completedThisWeek > 0) {
    wins.push(
      tr(locale, {
        en: `${m.completedThisWeek} completed this week.`,
        zhTW: `本週完成 ${m.completedThisWeek} 項。`,
        zhCN: `本周完成 ${m.completedThisWeek} 项。`,
      }),
    );
  }
  if (m.inProgress > 0) {
    wins.push(
      tr(locale, {
        en: `${m.inProgress} in progress.`,
        zhTW: `${m.inProgress} 項進行中。`,
        zhCN: `${m.inProgress} 项进行中。`,
      }),
    );
  }

  const risks: string[] = [];
  if (m.overdue > 0) {
    risks.push(
      tr(locale, {
        en: `${m.overdue} task(s) overdue.`,
        zhTW: `${m.overdue} 項逾期。`,
        zhCN: `${m.overdue} 项逾期。`,
      }),
    );
  }
  if (m.noProject > 0) {
    risks.push(
      tr(locale, {
        en: `${m.noProject} task(s) have no project.`,
        zhTW: `${m.noProject} 項未指派專案。`,
        zhCN: `${m.noProject} 项未指派项目。`,
      }),
    );
  }

  const recommendations: string[] = [];
  if (m.overdue > 0) {
    recommendations.push(
      tr(locale, {
        en: "Reschedule or clear overdue tasks first.",
        zhTW: "先重新安排或清理逾期任務。",
        zhCN: "先重新安排或清理逾期任务。",
      }),
    );
  }
  if (m.highUrgent > 0) {
    recommendations.push(
      tr(locale, {
        en: `Focus on ${m.highUrgent} high/urgent task(s) today.`,
        zhTW: `今天專注於 ${m.highUrgent} 項高/緊急任務。`,
        zhCN: `今天专注于 ${m.highUrgent} 项高/紧急任务。`,
      }),
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      tr(locale, {
        en: "Pick the next task and start a focus block.",
        zhTW: "挑下一項任務，開始一個專注時段。",
        zhCN: "挑下一项任务，开始一个专注时段。",
      }),
    );
  }

  return { headline, wins, risks, recommendations };
}
