import type { JapaneseStudySession } from "@/types/database";

export type StudySessionDisplay = {
  emoji: string;
  label: string;
  labelClass: string;
};

const FALLBACK: StudySessionDisplay = {
  emoji: "🙂",
  label: "Good",
  labelClass:
    "border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
};

const LABEL_STYLES: Record<string, string> = {
  Good: "border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
  Great: "border-violet-200/80 bg-violet-50 text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-200",
  Okay: "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
  Excellent:
    "border-pink-200/80 bg-pink-50 text-pink-900 dark:border-pink-900/50 dark:bg-pink-950/40 dark:text-pink-100",
};

/**
 * Reads optional JSON in `content`: `{ "emoji": "🙂", "rating": "Good" }`.
 * Falls back to a neutral pill so older rows still render cleanly.
 */
export function studySessionDisplay(session: JapaneseStudySession): StudySessionDisplay {
  const raw = session.content?.trim();
  if (!raw) return FALLBACK;
  try {
    const parsed = JSON.parse(raw) as { emoji?: string; rating?: string };
    const label = typeof parsed.rating === "string" ? parsed.rating : "Good";
    const emoji = typeof parsed.emoji === "string" ? parsed.emoji : FALLBACK.emoji;
    const labelClass = LABEL_STYLES[label] ?? FALLBACK.labelClass;
    return { emoji, label, labelClass };
  } catch {
    return FALLBACK;
  }
}
