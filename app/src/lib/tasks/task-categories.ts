/**
 * Task category resolution. Phase 1 derives a category from tags / project /
 * source / title; once the `category` column exists (migration) an explicit
 * value takes precedence. The canonical set powers filters and analytics, but
 * custom (user/AI authored) values are preserved and surfaced too.
 */
import type { Task } from "@/types/database";

export const TASK_CATEGORIES = [
  "academic",
  "business",
  "music",
  "personal",
  "admin",
  "creative",
  "health",
  "finance",
  "learning",
  "other",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

/** A task shape sufficient for category resolution (kept narrow for reuse/tests). */
export type CategorizableTask = Pick<Task, "tags" | "source" | "title"> & {
  category?: string | null;
  project?: { name?: string | null } | null;
};

const KEYWORDS: Record<Exclude<TaskCategory, "other">, string[]> = {
  academic: [
    "academic", "study", "exam", "thesis", "paper", "research", "course",
    "assignment", "homework", "lecture", "university", "school", "学", "學",
    "论文", "論文", "考试", "考試", "作业", "作業", "研究", "课", "課",
  ],
  business: [
    "business", "client", "sponsor", "sales", "invoice", "contract", "meeting",
    "pitch", "revenue", "marketing", "startup", "partnership", "商", "客户",
    "客戶", "赞助", "贊助", "合同", "合約", "会议", "會議", "行销", "行銷", "业务", "業務",
  ],
  music: [
    "music", "piano", "practice", "rehearsal", "concert", "song", "compose",
    "score", "recital", "violin", "guitar", "琴", "练习", "練習", "音乐", "音樂",
    "排练", "排練", "演奏", "作曲",
  ],
  personal: [
    "personal", "family", "home", "errand", "friend", "birthday", "个人",
    "個人", "家", "家庭", "朋友", "生日",
  ],
  admin: [
    "admin", "email", "schedule", "paperwork", "form", "renew", "file",
    "organize", "tax", "行政", "邮件", "郵件", "表格", "报税", "報稅", "整理",
  ],
  creative: [
    "design", "write", "draw", "video", "content", "art", "creative", "brand",
    "logo", "illustration", "设计", "設計", "写作", "寫作", "影片", "内容",
    "內容", "创作", "創作", "画", "畫",
  ],
  health: [
    "health", "gym", "workout", "run", "doctor", "sleep", "meditation", "diet",
    "exercise", "yoga", "健康", "运动", "運動", "医生", "醫生", "睡眠", "冥想", "健身",
  ],
  finance: [
    "finance", "budget", "money", "bank", "invest", "expense", "pay", "bill",
    "财务", "財務", "预算", "預算", "投资", "投資", "账单", "帳單", "付款", "银行", "銀行",
  ],
  learning: [
    "learn", "tutorial", "read", "book", "skill", "language", "japanese",
    "english", "学习", "學習", "教学", "教學", "阅读", "閱讀", "书", "書",
    "技能", "语言", "語言", "日文", "英文",
  ],
};

export function normalizeCategory(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  return v || null;
}

export function isCanonicalCategory(value: string): value is TaskCategory {
  return (TASK_CATEGORIES as readonly string[]).includes(value);
}

/** Heuristic category from tags/source/title/project name. Returns null if nothing matches. */
export function deriveTaskCategory(task: CategorizableTask): TaskCategory | null {
  const tags = (task.tags ?? []).map((t) => t.toLowerCase());

  // An exact canonical tag wins (e.g. tag "finance").
  for (const cat of TASK_CATEGORIES) {
    if (cat === "other") continue;
    if (tags.includes(cat)) return cat;
  }

  const haystack = [...tags, task.source ?? "", task.title ?? "", task.project?.name ?? ""]
    .join(" ")
    .toLowerCase();
  if (!haystack.trim()) return null;

  let best: { cat: TaskCategory; score: number } | null = null;
  for (const cat of Object.keys(KEYWORDS) as Exclude<TaskCategory, "other">[]) {
    let score = 0;
    for (const kw of KEYWORDS[cat]) {
      if (haystack.includes(kw)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { cat, score };
  }
  return best?.cat ?? null;
}

/** Explicit `category` column wins; otherwise fall back to the heuristic. */
export function resolveTaskCategory(task: CategorizableTask): string | null {
  const explicit = normalizeCategory(task.category);
  if (explicit) return explicit;
  return deriveTaskCategory(task);
}

/** Categories actually present in the data: canonical (in order) then custom (sorted). */
export function collectTaskCategories(tasks: CategorizableTask[]): string[] {
  const present = new Set<string>();
  for (const t of tasks) {
    const c = resolveTaskCategory(t);
    if (c) present.add(c);
  }
  const canonical = TASK_CATEGORIES.filter((c) => present.has(c));
  const extras = [...present]
    .filter((c) => !isCanonicalCategory(c))
    .sort((a, b) => a.localeCompare(b));
  return [...canonical, ...extras];
}
