/**
 * Rule-based task insight derived entirely from {@link TaskAnalytics}. This is
 * the always-available, no-network summary shown in the insight panel; the AI
 * summary endpoint (wave 8) can replace it with an enhanced version on demand.
 */
import type { TaskAnalytics } from "./task-analytics";
import { taskCategoryLabel, type TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";
import { UNCATEGORIZED_KEY } from "./task-analytics";

export type TaskInsight = {
  headline: string;
  wins: string[];
  risks: string[];
  recommendations: string[];
};

function tr(
  locale: string,
  v: { en: string; zhTW: string; zhCN: string },
): string {
  if (locale === "zh-TW") return v.zhTW;
  if (locale === "zh-CN") return v.zhCN;
  return v.en;
}

export function buildLocalTaskInsight(
  a: TaskAnalytics,
  locale: string,
  centerCopy: TasksCenterUiCopy,
): TaskInsight {
  const o = a.overview;
  const pct = Math.round(a.completionRate * 100);

  const headline = tr(locale, {
    en: `${o.active} active, ${o.overdue} overdue, ${pct}% completed overall.`,
    zhTW: `${o.active} 項進行中、${o.overdue} 項逾期，整體完成率 ${pct}%。`,
    zhCN: `${o.active} 项进行中、${o.overdue} 项逾期，整体完成率 ${pct}%。`,
  });

  const wins: string[] = [];
  if (o.completedThisWeek > 0) {
    wins.push(
      tr(locale, {
        en: `${o.completedThisWeek} completed this week.`,
        zhTW: `本週完成 ${o.completedThisWeek} 項。`,
        zhCN: `本周完成 ${o.completedThisWeek} 项。`,
      }),
    );
  }
  if (o.inProgress > 0) {
    wins.push(
      tr(locale, {
        en: `${o.inProgress} task(s) in progress.`,
        zhTW: `${o.inProgress} 項進行中。`,
        zhCN: `${o.inProgress} 项进行中。`,
      }),
    );
  }
  const topCategory = a.byCategory.find((c) => c.key !== UNCATEGORIZED_KEY);
  if (topCategory) {
    wins.push(
      tr(locale, {
        en: `Most work is in "${taskCategoryLabel(centerCopy, topCategory.key)}" (${topCategory.count}).`,
        zhTW: `多數任務集中在「${taskCategoryLabel(centerCopy, topCategory.key)}」（${topCategory.count}）。`,
        zhCN: `多数任务集中在「${taskCategoryLabel(centerCopy, topCategory.key)}」（${topCategory.count}）。`,
      }),
    );
  }

  const risks: string[] = [];
  if (o.overdue > 0) {
    risks.push(
      tr(locale, {
        en: `${o.overdue} task(s) overdue.`,
        zhTW: `${o.overdue} 項逾期。`,
        zhCN: `${o.overdue} 项逾期。`,
      }),
    );
  }
  if (o.dueToday > 0) {
    risks.push(
      tr(locale, {
        en: `${o.dueToday} due today.`,
        zhTW: `${o.dueToday} 項今天到期。`,
        zhCN: `${o.dueToday} 项今天到期。`,
      }),
    );
  }
  if (o.noProject > 0) {
    risks.push(
      tr(locale, {
        en: `${o.noProject} task(s) without a project.`,
        zhTW: `${o.noProject} 項未指派專案。`,
        zhCN: `${o.noProject} 项未指派项目。`,
      }),
    );
  }

  const recommendations: string[] = [];
  if (o.overdue > 0) {
    recommendations.push(
      tr(locale, {
        en: "Clear or reschedule overdue tasks first.",
        zhTW: "先清理或重新安排逾期任務。",
        zhCN: "先清理或重新安排逾期任务。",
      }),
    );
  }
  if (o.highPriority > 0) {
    recommendations.push(
      tr(locale, {
        en: `Protect a focus block for ${o.highPriority} high/urgent task(s).`,
        zhTW: `為 ${o.highPriority} 項高/緊急任務保留專注時段。`,
        zhCN: `为 ${o.highPriority} 项高/紧急任务保留专注时段。`,
      }),
    );
  }
  if (o.noProject > 0) {
    recommendations.push(
      tr(locale, {
        en: "Assign loose tasks to a project for clarity.",
        zhTW: "將零散任務指派到專案，讓重點更清楚。",
        zhCN: "将零散任务指派到项目，让重点更清楚。",
      }),
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      tr(locale, {
        en: "On track — pick the next task and start a focus block.",
        zhTW: "進度良好——挑下一項任務，開始專注時段。",
        zhCN: "进度良好——挑下一项任务，开始专注时段。",
      }),
    );
  }

  return { headline, wins, risks, recommendations };
}
