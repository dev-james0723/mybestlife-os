import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { Habit, HabitCompletion, RoutineWithSteps } from "@/lib/habits/types";

type CompactItem = {
  id: string;
  title: string;
  detail?: string | null;
  status?: string | null;
  sourceKind: string;
};

export type HabitSecretaryContext = {
  language: AppLocale;
  today: string;
  activeGoals: CompactItem[];
  activeProjects: CompactItem[];
  openTasks: CompactItem[];
  plannerSignals: CompactItem[];
  calendarDensity: {
    todaySyncedBlocks: number;
    upcomingSyncedBlocks: number;
    note: string;
  };
  knowledgeSignals: CompactItem[];
  aiKnowledgeSignals: CompactItem[];
  careerSignals: CompactItem[];
  existingHabits: Pick<
    Habit,
    "id" | "name" | "description" | "type" | "target_value" | "frequency" | "time_of_day"
  >[];
  routines: Pick<RoutineWithSteps, "id" | "name" | "description" | "time_of_day">[];
  recentCompletionRate: number | null;
  missedHabitNames: string[];
};

async function safeSelect<T>(
  run: () => PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<T[]> {
  try {
    const { data, error } = await run();
    if (error) return [];
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

function asText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function compact(row: Record<string, unknown>, sourceKind: string): CompactItem {
  return {
    id: String(row.id ?? ""),
    title:
      asText(row.name) ??
      asText(row.title) ??
      asText(row.current_role) ??
      asText(row.career_goals) ??
      "Untitled",
    detail:
      asText(row.description) ??
      asText(row.content) ??
      asText(row.summary) ??
      asText(row.twelve_month_goals) ??
      asText(row.body),
    status: asText(row.status),
    sourceKind,
  };
}

function summarizePlannerTask(task: unknown, sourceKind: string): CompactItem | null {
  if (!task || typeof task !== "object") return null;
  const row = task as Record<string, unknown>;
  const title = asText(row.title) ?? asText(row.label) ?? asText(row.name);
  if (!title) return null;
  return {
    id: asText(row.id) ?? title,
    title,
    detail: asText(row.note) ?? asText(row.description),
    status: asText(row.status) ?? (row.done === true ? "done" : null),
    sourceKind,
  };
}

function extractPlannerSignals(rows: Record<string, unknown>[]): CompactItem[] {
  const out: CompactItem[] = [];
  for (const row of rows.slice(0, 7)) {
    for (const key of ["tasks", "free_tasks"]) {
      const list = row[key];
      if (!Array.isArray(list)) continue;
      for (const task of list) {
        const item = summarizePlannerTask(task, "daily_planner");
        if (item && item.status !== "done") out.push(item);
      }
    }
  }
  return out.slice(0, 12);
}

export function formatHabitSecretaryContext(ctx: HabitSecretaryContext): string {
  const lines: string[] = [
    `Today: ${ctx.today}`,
    `Language: ${ctx.language}`,
    `Calendar density: ${ctx.calendarDensity.note}`,
    `Recent habit completion rate: ${
      ctx.recentCompletionRate == null
        ? "unknown"
        : `${Math.round(ctx.recentCompletionRate * 100)}%`
    }`,
  ];

  const pushItems = (label: string, items: CompactItem[]) => {
    if (items.length === 0) return;
    lines.push(`${label}:`);
    for (const item of items.slice(0, 8)) {
      lines.push(
        `- ${item.title}${item.status ? ` (${item.status})` : ""}${
          item.detail ? `: ${item.detail.slice(0, 160)}` : ""
        }`,
      );
    }
  };

  pushItems("Goals", ctx.activeGoals);
  pushItems("Projects", ctx.activeProjects);
  pushItems("Open tasks", ctx.openTasks);
  pushItems("Planner signals", ctx.plannerSignals);
  pushItems("Knowledge", ctx.knowledgeSignals);
  pushItems("AI Knowledge", ctx.aiKnowledgeSignals);
  pushItems("Career", ctx.careerSignals);

  if (ctx.existingHabits.length) {
    lines.push("Existing habits:");
    for (const h of ctx.existingHabits.slice(0, 12)) {
      lines.push(`- ${h.name} (${h.type}, ${h.time_of_day})`);
    }
  }
  if (ctx.missedHabitNames.length) {
    lines.push(`Recently missed habits: ${ctx.missedHabitNames.slice(0, 8).join(", ")}`);
  }

  return lines.join("\n");
}

export async function buildHabitSecretaryContext(args: {
  supabase: SupabaseClient;
  language: AppLocale;
  today: string;
}): Promise<HabitSecretaryContext> {
  const { supabase, language, today } = args;
  const sevenDaysAgo = new Date(`${today}T00:00:00.000Z`);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  const from = sevenDaysAgo.toISOString().slice(0, 10);

  const [
    goals,
    projects,
    tasks,
    plans,
    calendarToday,
    calendarUpcoming,
    knowledge,
    aiPrompts,
    career,
    habits,
    completions,
    routines,
    routineSteps,
  ] = await Promise.all([
    safeSelect<Record<string, unknown>>(() =>
      supabase
        .from("goals")
        .select("id,name,description,status,target_date,category")
        .in("status", ["active", "in_progress", "planning"])
        .limit(12),
    ),
    safeSelect<Record<string, unknown>>(() =>
      supabase
        .from("projects")
        .select("id,name,description,status,priority,tags")
        .in("status", ["planning", "active", "in_progress"])
        .limit(12),
    ),
    safeSelect<Record<string, unknown>>(() =>
      supabase
        .from("tasks")
        .select("id,title,description,status,priority,due_date,project_id")
        .in("status", ["todo", "in_progress"])
        .limit(20),
    ),
    safeSelect<Record<string, unknown>>(() =>
      supabase
        .from("daily_plans")
        .select("id,plan_date,tasks,free_tasks,mode")
        .gte("plan_date", from)
        .lte("plan_date", today)
        .order("plan_date", { ascending: false })
        .limit(7),
    ),
    safeSelect<Record<string, unknown>>(() =>
      supabase
        .from("calendar_task_sync")
        .select("id,planner_task_id,plan_date,google_event_id")
        .eq("plan_date", today)
        .limit(30),
    ),
    safeSelect<Record<string, unknown>>(() =>
      supabase
        .from("calendar_task_sync")
        .select("id,planner_task_id,plan_date,google_event_id")
        .gte("plan_date", today)
        .limit(60),
    ),
    safeSelect<Record<string, unknown>>(() =>
      supabase
        .from("knowledge_items")
        .select("id,title,summary,content,updated_at")
        .order("updated_at", { ascending: false })
        .limit(8),
    ),
    safeSelect<Record<string, unknown>>(() =>
      supabase
        .from("ai_user_prompts")
        .select("id,title_i18n,description_i18n,body,top_category,last_used_at,usage_count")
        .order("updated_at", { ascending: false })
        .limit(8),
    ),
    safeSelect<Record<string, unknown>>(() =>
      supabase
        .from("career_profile")
        .select("user_id,current_role,industry,career_goals,twelve_month_goals,pain_points,target_roles")
        .limit(1),
    ),
    safeSelect<Habit>(() =>
      supabase
        .from("habits")
        .select("id,user_id,name,description,type,target_value,frequency,time_of_day,color,icon,sort_order,is_active,archived_at,created_at,updated_at")
        .is("archived_at", null)
        .eq("is_active", true)
        .limit(30),
    ),
    safeSelect<HabitCompletion>(() =>
      supabase
        .from("habit_completions")
        .select("*")
        .gte("completion_date", from)
        .lte("completion_date", today)
        .limit(200),
    ),
    safeSelect<Record<string, unknown>>(() =>
      supabase
        .from("routines")
        .select("id,user_id,name,description,time_of_day,color,icon,sort_order,is_active,archived_at,created_at,updated_at")
        .is("archived_at", null)
        .eq("is_active", true)
        .limit(20),
    ),
    safeSelect<Record<string, unknown>>(() =>
      supabase.from("routine_steps").select("*").limit(100),
    ),
  ]);

  const done = completions.filter((c) => c.status === "done").length;
  const expected = Math.max(1, habits.length * 7);
  const recentCompletionRate = habits.length ? done / expected : null;
  const completedHabitIds = new Set(
    completions.filter((c) => c.status === "done").map((c) => c.habit_id),
  );
  const missedHabitNames = habits
    .filter((h) => !completedHabitIds.has(h.id))
    .map((h) => h.name);

  const stepsByRoutine = new Map<string, Record<string, unknown>[]>();
  for (const step of routineSteps) {
    const routineId = asText(step.routine_id);
    if (!routineId) continue;
    const list = stepsByRoutine.get(routineId) ?? [];
    list.push(step);
    stepsByRoutine.set(routineId, list);
  }

  const calendarCount = calendarToday.length;
  const calendarNote =
    calendarCount >= 6
      ? "Heavy day. Avoid afternoon habit load."
      : calendarCount >= 3
        ? "Moderate day. Keep habits short and anchored."
        : "Light or unsynced day. There may be room for a focused block.";

  return {
    language,
    today,
    activeGoals: goals.map((r) => compact(r, "goal")),
    activeProjects: projects.map((r) => compact(r, "project")),
    openTasks: tasks.map((r) => compact(r, "task")),
    plannerSignals: extractPlannerSignals(plans),
    calendarDensity: {
      todaySyncedBlocks: calendarToday.length,
      upcomingSyncedBlocks: calendarUpcoming.length,
      note: calendarNote,
    },
    knowledgeSignals: knowledge.map((r) => compact(r, "knowledge")),
    aiKnowledgeSignals: aiPrompts.map((r) => {
      const titleI18n = r.title_i18n as Record<string, unknown> | undefined;
      const descI18n = r.description_i18n as Record<string, unknown> | undefined;
      return {
        id: String(r.id ?? ""),
        title: asText(titleI18n?.en) ?? asText(titleI18n?.["zh-TW"]) ?? "AI prompt",
        detail: asText(descI18n?.en) ?? asText(descI18n?.["zh-TW"]) ?? asText(r.body),
        status: asText(r.top_category),
        sourceKind: "ai_knowledge",
      };
    }),
    careerSignals: career.map((r) => compact(r, "career_profile")),
    existingHabits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      type: h.type,
      target_value: h.target_value,
      frequency: h.frequency,
      time_of_day: h.time_of_day,
    })),
    routines: routines.map((r) => ({
      id: String(r.id),
      name: String(r.name ?? "Routine"),
      description: asText(r.description),
      time_of_day:
        r.time_of_day === "morning" ||
        r.time_of_day === "afternoon" ||
        r.time_of_day === "evening" ||
        r.time_of_day === "anytime"
          ? r.time_of_day
          : "anytime",
      steps: (stepsByRoutine.get(String(r.id)) ?? []) as RoutineWithSteps["steps"],
      user_id: String(r.user_id ?? ""),
      color: asText(r.color),
      icon: asText(r.icon),
      sort_order: Number(r.sort_order ?? 0),
      is_active: r.is_active !== false,
      archived_at: asText(r.archived_at),
      created_at: String(r.created_at ?? ""),
      updated_at: String(r.updated_at ?? ""),
    })),
    recentCompletionRate,
    missedHabitNames,
  };
}
