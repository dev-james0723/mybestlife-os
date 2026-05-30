import { NextResponse } from "next/server";
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import { getLlmResponseLanguageDirective } from "@/lib/ai/llm-response-locale";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiServerApiKey,
  type GeminiResponseSchema,
} from "@/lib/ai/gemini-text";
import {
  TaskBreakdownAiSchema,
  TaskBreakdownGeminiSchema,
  TaskCleanupAiSchema,
  TaskCleanupGeminiSchema,
  TaskCreateAiSchema,
  TaskCreateGeminiSchema,
  TaskPrioritizeAiSchema,
  TaskPrioritizeGeminiSchema,
  TaskReviewAiSchema,
  TaskReviewGeminiSchema,
  TaskScheduleAiSchema,
  TaskScheduleGeminiSchema,
  TASK_AI_MODES,
  type TaskAiMode,
} from "@/lib/ai/schemas/tasks";
import {
  buildBreakdownPrompt,
  buildCleanupPrompt,
  buildCreatePrompt,
  buildPrioritizePrompt,
  buildReviewPrompt,
  buildSchedulePrompt,
  type TaskLite,
} from "@/lib/ai/prompts/tasks";
import {
  fallbackBreakdown,
  fallbackCleanup,
  fallbackCreate,
  fallbackPrioritize,
  fallbackReview,
  fallbackSchedule,
  type ReviewMetrics,
} from "@/lib/ai/tasks-fallback";
import type { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

type TaskAiRequestBody = {
  mode?: string;
  locale?: string;
  language?: string;
  prompt?: string;
  title?: string;
  description?: string;
  projectName?: string;
  taskIds?: unknown;
};

type TaskRow = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  scheduled_date: string | null;
  category: string | null;
  project_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  project?: { name?: string | null } | { name?: string | null }[] | null;
};

function projectName(row: TaskRow): string | null {
  const p = row.project;
  if (!p) return null;
  if (Array.isArray(p)) return p[0]?.name ?? null;
  return p.name ?? null;
}

function toLite(row: TaskRow): TaskLite {
  return {
    id: row.id,
    title: row.title,
    status: row.status ?? undefined,
    priority: row.priority ?? undefined,
    dueDate: row.due_date,
    scheduledDate: row.scheduled_date,
    category: row.category,
    project: projectName(row),
    updatedAt: row.updated_at,
  };
}

const TODAY_FMT = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

/** Run a structured Gemini call and validate with Zod. Throws on any failure. */
async function generateStructured<T>(
  apiKey: string,
  schema: z.ZodType<T>,
  geminiSchema: GeminiResponseSchema,
  system: string,
  user: string,
): Promise<T> {
  const { data } = await fetchGeminiStructured<unknown>({
    apiKey,
    model: getGeminiHabitsFlashModel(),
    systemInstruction: system,
    userText: user,
    responseSchema: geminiSchema,
    temperature: 0.4,
    maxOutputTokens: 2048,
  });
  return schema.parse(data);
}

function isOpen(status: string | null): boolean {
  return status !== "done" && status !== "cancelled";
}

function computeMetrics(rows: TaskRow[], today: Date): ReviewMetrics {
  const start = startOfDay(today);
  let active = 0;
  let inProgress = 0;
  let completedThisWeek = 0;
  let overdue = 0;
  let dueToday = 0;
  let noProject = 0;
  let highUrgent = 0;

  for (const r of rows) {
    const open = isOpen(r.status);
    if (open) active += 1;
    if (r.status === "in-progress") inProgress += 1;
    if (open && !r.project_id) noProject += 1;
    if (open && (r.priority === "high" || r.priority === "urgent")) highUrgent += 1;

    if (r.completed_at) {
      try {
        const diff = differenceInCalendarDays(start, startOfDay(parseISO(r.completed_at)));
        if (diff >= 0 && diff <= 7) completedThisWeek += 1;
      } catch {
        /* ignore unparseable */
      }
    }
    if (open && r.due_date) {
      try {
        const diff = differenceInCalendarDays(parseISO(r.due_date), start);
        if (diff < 0) overdue += 1;
        else if (diff === 0) dueToday += 1;
      } catch {
        /* ignore */
      }
    }
  }

  return {
    total: rows.length,
    active,
    inProgress,
    completedThisWeek,
    overdue,
    dueToday,
    noProject,
    highUrgent,
  };
}

function metricsText(m: ReviewMetrics): string {
  return [
    `total=${m.total}`,
    `active=${m.active}`,
    `in_progress=${m.inProgress}`,
    `completed_last_7_days=${m.completedThisWeek}`,
    `overdue=${m.overdue}`,
    `due_today=${m.dueToday}`,
    `no_project=${m.noProject}`,
    `high_or_urgent=${m.highUrgent}`,
  ].join("\n");
}

async function fetchTasks(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  taskIds: string[] | null,
): Promise<TaskRow[]> {
  let query = supabase
    .from("tasks")
    .select(
      "id, title, status, priority, due_date, scheduled_date, category, project_id, created_at, updated_at, completed_at, project:projects(name)",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (taskIds && taskIds.length > 0) {
    query = query.in("id", taskIds);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TaskRow[];
}

/** Tasks worth acting on for prioritize / schedule (open only). */
function openTasks(rows: TaskRow[]): TaskRow[] {
  return rows.filter((r) => isOpen(r.status));
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TaskAiRequestBody;
  try {
    body = (await request.json()) as TaskAiRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode as TaskAiMode | undefined;
  if (!mode || !(TASK_AI_MODES as readonly string[]).includes(mode)) {
    return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
  }

  const locale = parseAppLocale(body.locale ?? body.language);
  const languageRule = getLlmResponseLanguageDirective(locale);
  const apiKey = getGeminiServerApiKey();
  const now = new Date();
  const today = TODAY_FMT(now);

  const taskIds = Array.isArray(body.taskIds)
    ? body.taskIds.filter((x): x is string => typeof x === "string")
    : null;

  try {
    // -------------------------------------------------------------------
    // create — natural language -> one structured task draft
    // -------------------------------------------------------------------
    if (mode === "create") {
      const prompt = String(body.prompt ?? "").trim();
      if (!prompt) {
        return NextResponse.json({ error: "prompt required" }, { status: 400 });
      }
      if (!apiKey) {
        return NextResponse.json({
          ...fallbackCreate(prompt, locale),
          source: "fallback" as const,
        });
      }
      try {
        const { system, user: userMsg } = buildCreatePrompt({
          prompt,
          today,
          languageRule,
          projectName: body.projectName?.trim() || undefined,
        });
        const result = await generateStructured(
          apiKey,
          TaskCreateAiSchema,
          TaskCreateGeminiSchema,
          system,
          userMsg,
        );
        return NextResponse.json({ ...result, source: "gemini" as const });
      } catch (e) {
        logFail("create", e);
        return NextResponse.json({
          ...fallbackCreate(prompt, locale),
          source: "fallback" as const,
        });
      }
    }

    // -------------------------------------------------------------------
    // breakdown — single task -> ordered subtasks
    // -------------------------------------------------------------------
    if (mode === "breakdown") {
      const title = String(body.title ?? "").trim();
      if (!title) {
        return NextResponse.json({ error: "title required" }, { status: 400 });
      }
      if (!apiKey) {
        return NextResponse.json({
          ...fallbackBreakdown(title, locale),
          source: "fallback" as const,
        });
      }
      try {
        const { system, user: userMsg } = buildBreakdownPrompt({
          title,
          description: body.description?.trim(),
          languageRule,
        });
        const result = await generateStructured(
          apiKey,
          TaskBreakdownAiSchema,
          TaskBreakdownGeminiSchema,
          system,
          userMsg,
        );
        return NextResponse.json({ ...result, source: "gemini" as const });
      } catch (e) {
        logFail("breakdown", e);
        return NextResponse.json({
          ...fallbackBreakdown(title, locale),
          source: "fallback" as const,
        });
      }
    }

    // Remaining modes operate over the user's task list.
    const rows = await fetchTasks(supabase, user.id, taskIds);

    if (mode === "prioritize") {
      const lite = openTasks(rows).map(toLite);
      if (lite.length === 0 || !apiKey) {
        return NextResponse.json({
          ...fallbackPrioritize(lite, now, locale),
          source: "fallback" as const,
        });
      }
      try {
        const { system, user: userMsg } = buildPrioritizePrompt({
          tasks: lite,
          today,
          languageRule,
        });
        const result = await generateStructured(
          apiKey,
          TaskPrioritizeAiSchema,
          TaskPrioritizeGeminiSchema,
          system,
          userMsg,
        );
        return NextResponse.json({ ...result, source: "gemini" as const });
      } catch (e) {
        logFail("prioritize", e);
        return NextResponse.json({
          ...fallbackPrioritize(lite, now, locale),
          source: "fallback" as const,
        });
      }
    }

    if (mode === "schedule") {
      const lite = openTasks(rows).map(toLite);
      if (lite.length === 0 || !apiKey) {
        return NextResponse.json({
          ...fallbackSchedule(lite, now, locale),
          source: "fallback" as const,
        });
      }
      try {
        const { system, user: userMsg } = buildSchedulePrompt({
          tasks: lite,
          today,
          languageRule,
        });
        const result = await generateStructured(
          apiKey,
          TaskScheduleAiSchema,
          TaskScheduleGeminiSchema,
          system,
          userMsg,
        );
        return NextResponse.json({ ...result, source: "gemini" as const });
      } catch (e) {
        logFail("schedule", e);
        return NextResponse.json({
          ...fallbackSchedule(lite, now, locale),
          source: "fallback" as const,
        });
      }
    }

    if (mode === "cleanup") {
      const lite = rows.map(toLite);
      if (lite.length === 0 || !apiKey) {
        return NextResponse.json({
          ...fallbackCleanup(lite, now, locale),
          source: "fallback" as const,
        });
      }
      try {
        const { system, user: userMsg } = buildCleanupPrompt({
          tasks: lite,
          today,
          languageRule,
        });
        const result = await generateStructured(
          apiKey,
          TaskCleanupAiSchema,
          TaskCleanupGeminiSchema,
          system,
          userMsg,
        );
        return NextResponse.json({ ...result, source: "gemini" as const });
      } catch (e) {
        logFail("cleanup", e);
        return NextResponse.json({
          ...fallbackCleanup(lite, now, locale),
          source: "fallback" as const,
        });
      }
    }

    // weekly-review | summary
    const metrics = computeMetrics(rows, now);
    if (!apiKey) {
      return NextResponse.json({
        ...fallbackReview(mode, metrics, locale),
        source: "fallback" as const,
      });
    }
    try {
      const { system, user: userMsg } = buildReviewPrompt({
        mode,
        metricsText: metricsText(metrics),
        languageRule,
      });
      const result = await generateStructured(
        apiKey,
        TaskReviewAiSchema,
        TaskReviewGeminiSchema,
        system,
        userMsg,
      );
      return NextResponse.json({ ...result, source: "gemini" as const });
    } catch (e) {
      logFail(mode, e);
      return NextResponse.json({
        ...fallbackReview(mode, metrics, locale),
        source: "fallback" as const,
      });
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ai/tasks] unexpected error:", e);
    }
    return NextResponse.json(
      { error: "ai_generation_failed" },
      { status: 500 },
    );
  }
}

function logFail(mode: string, e: unknown) {
  if (process.env.NODE_ENV !== "production") {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[ai/tasks:${mode}] Gemini path failed, using fallback: ${msg.slice(0, 200)}`);
  }
}
