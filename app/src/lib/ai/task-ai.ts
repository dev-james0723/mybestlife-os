/**
 * Typed client for `POST /api/ai/tasks`. Mirrors `postPlannerAi`.
 * The result type is selected by `mode`; every response carries `source` so
 * callers can show whether it came from Gemini or the deterministic fallback.
 */
import type { AppLocale } from "@/lib/i18n/app-locale";
import type {
  TaskAiMode,
  TaskAiResultByMode,
  TaskAiSource,
} from "@/lib/ai/schemas/tasks";

export type { TaskAiSource };

export type TaskAiResponse<M extends TaskAiMode> = TaskAiResultByMode[M] & {
  source: TaskAiSource;
};

export type TaskAiPayload = {
  locale: AppLocale;
  /** create: natural-language request */
  prompt?: string;
  /** breakdown: the task being split */
  title?: string;
  description?: string;
  /** create: inherited project name (context only) */
  projectName?: string;
  /** prioritize/schedule/cleanup: restrict to a subset (omit = all tasks) */
  taskIds?: string[];
};

export class TaskAiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "TaskAiError";
    this.code = code;
  }
}

export async function postTaskAi<M extends TaskAiMode>(
  mode: M,
  payload: TaskAiPayload,
): Promise<TaskAiResponse<M>> {
  const res = await fetch("/api/ai/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, ...payload }),
  });
  if (res.status === 401) {
    throw new TaskAiError("unauthorized", "unauthorized");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new TaskAiError(text || "request_failed");
  }
  return (await res.json()) as TaskAiResponse<M>;
}
