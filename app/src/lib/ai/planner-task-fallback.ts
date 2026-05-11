import type { AppLocale } from "@/lib/i18n/app-locale";
import type { PlannerAiClarification, PlannerAiQuestion } from "./planner-task-types";
import {
  PLANNER_FALLBACK_GENERIC,
  PLANNER_FALLBACK_MEET,
} from "./planner-task-fallback-by-locale";

const COFFEE_RE = /coffee|咖啡|caf[eé]|コーヒー|カフェ|커피|cà\s*phê/i;
const MEET_RE =
  /meet|meeting|chat|會面|會議|聊天|約|catch\s*up|1:1|coffee\s*chat|会議|打ち合わせ|ミーティング|面談|飲み会|미팅|만남|약속|rendez-vous|rencontre|reuni[oó]n|cita|cuộc\s+gặp/i;

function isSocialMeetTitle(title: string): boolean {
  const t = title.trim();
  if (!t) return false;
  return MEET_RE.test(t) || COFFEE_RE.test(t);
}

function fallbackMeetQuestions(locale: AppLocale): PlannerAiQuestion[] {
  return PLANNER_FALLBACK_MEET[locale];
}

function fallbackGenericQuestions(locale: AppLocale): PlannerAiQuestion[] {
  return PLANNER_FALLBACK_GENERIC[locale];
}

/** Offline clarifying questions when the model is unavailable. */
export function getFallbackPlannerQuestions(
  taskTitle: string,
  locale: AppLocale,
): PlannerAiQuestion[] {
  const qs = isSocialMeetTitle(taskTitle)
    ? fallbackMeetQuestions(locale)
    : fallbackGenericQuestions(locale);
  return normalizeQuestions(qs, taskTitle, locale);
}

function clampOptions(opts: string[]): string[] {
  const u = [...new Set(opts.map((s) => s.trim()).filter(Boolean))];
  if (u.length >= 4) return u.slice(0, 4);
  while (u.length < 3) u.push(`Option ${u.length + 1}`);
  return u;
}

export function normalizeQuestions(
  raw: PlannerAiQuestion[],
  taskTitle: string,
  locale: AppLocale,
): PlannerAiQuestion[] {
  const out: PlannerAiQuestion[] = [];
  for (let i = 0; i < raw.length; i++) {
    const q = raw[i];
    if (!q?.question?.trim()) continue;
    const options = clampOptions(Array.isArray(q.options) ? q.options : []);
    const id = typeof q.id === "string" && q.id.trim() ? q.id.trim() : `q${i + 1}`;
    out.push({ id, question: q.question.trim(), options });
  }
  const limited = out.slice(0, 5);
  return limited.length >= 3 ? limited : getFallbackPlannerQuestions(taskTitle, locale);
}

/** Infer 10-minute blocks from free-text answers (offline, multilingual hints). */
export function inferFallbackBlocks(
  taskTitle: string,
  clarifications: PlannerAiClarification[],
  blockMinutes: number,
): number {
  if (isSocialMeetTitle(taskTitle) && clarifications.length === 0) {
    return Math.min(72, Math.max(3, Math.round(40 / blockMinutes)));
  }

  const text = `${taskTitle}\n${clarifications.map((c) => c.answer).join("\n")}`;
  const lower = text.toLowerCase();

  const minutesFromPhrase = (): number | null => {
    if (
      /\b(15|20)\s*min|\b15–30|15-30|半小時前|15\s*到\s*30|15〜30|15～30|15\s*분\s*[-–]?\s*30|15\s*phút/i.test(
        text,
      )
    )
      return 25;
    if (
      /\b30\s*min|\b30–60|30-60|半小時|半小时|half\s*an?\s*hour|30\s*到\s*60|30〜60|30～60|30분|30\s*phút/i.test(
        text,
      )
    )
      return 45;
    if (/\b45\b|45分|45\s*phút|45\s*min/i.test(text)) return 45;
    if (
      /\b60\b|\b1\s*h|\b1\s*hour|一個?小時|1\s*小時|1–2|1-2\s*h|1時間|1\s*giờ|1\s*h\b|1h\b|une?\s*heure|un’?ora|una\s*hora/i.test(
        text,
      )
    )
      return 60;
    if (/\b90\b|1\.5|一個半|一个半小时|90分|90\s*min|1\.5\s*h|1h30|1\s*h\s*30/i.test(text))
      return 90;
    if (
      /\b120\b|\b2\s*h|兩小時|两小时|2\s*小時|more\s*than\s*2|2\s*\+|半天|2時間|2\s*giờ|2\s*heures|2\s*ore|2\s*horas/i.test(
        text,
      )
    )
      return 120;
    if (/深度|deep|半天|half\s*day|3\s*\+|3\+|半日|deep\s*work/i.test(text)) return 180;
    if (/很快|quick|<\s*30|小於\s*30|30分未満|30분\s*미만|rapide|breve|rápido|nhanh/i.test(lower))
      return 20;
    if (/中等|medium|1–2|1-2|moyen|medio|vừa/i.test(lower)) return 60;
    return null;
  };

  const mins = minutesFromPhrase();
  const blocks = mins != null ? Math.max(1, Math.round(mins / blockMinutes)) : 3;

  return Math.min(72, Math.max(1, blocks));
}
