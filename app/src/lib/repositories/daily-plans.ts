import { createClient } from "@/lib/supabase/client";
import { hasDevLoginBypassCookie } from "@/lib/dev-login-bypass";
import {
  coerceDailyPlanTasks,
  coerceFreePlanTasks,
  coercePlanningMode,
} from "@/lib/normalize-plan-tasks";
import type {
  DailyPlan,
  DailyPlanTask,
  FreePlanTask,
  PlanningMode,
} from "@/types/database";

function withNormalizedTasks<T extends DailyPlan>(row: T): T {
  return {
    ...row,
    tasks: coerceDailyPlanTasks(row.tasks),
    free_tasks: coerceFreePlanTasks(row.free_tasks),
    mode: coercePlanningMode(row.mode),
  };
}

const LOCAL_DAILY_PLAN_STORAGE_PREFIX = "mylifeos:daily-plan:v1:";

function isBrowserLocalDailyPlansMode(): boolean {
  return typeof window !== "undefined" && hasDevLoginBypassCookie();
}

function localDailyPlanStorageKey(planDate: string): string {
  return `${LOCAL_DAILY_PLAN_STORAGE_PREFIX}${planDate}`;
}

function readLocalDailyPlan(planDate: string): DailyPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(localDailyPlanStorageKey(planDate));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const row = parsed as Partial<DailyPlan>;
    if (typeof row.plan_date !== "string" || row.plan_date !== planDate) return null;
    return withNormalizedTasks({
      id: `local:${planDate}`,
      user_id: "00000000-0000-0000-0000-000000000000",
      plan_date: planDate,
      start_time: typeof row.start_time === "string" ? row.start_time : "06:00",
      end_time: typeof row.end_time === "string" ? row.end_time : "22:00",
      tasks: Array.isArray(row.tasks) ? row.tasks : [],
      free_tasks: Array.isArray(row.free_tasks) ? row.free_tasks : [],
      mode: typeof row.mode === "string" ? (row.mode as PlanningMode) : "time-block",
      schedule_image_url:
        row.schedule_image_url === null || typeof row.schedule_image_url === "string"
          ? row.schedule_image_url
          : null,
      template_id:
        row.template_id === null || typeof row.template_id === "string"
          ? row.template_id
          : null,
      created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      updated_at: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
    } as DailyPlan);
  } catch {
    return null;
  }
}

function writeLocalDailyPlan(row: DailyPlan): void {
  if (typeof window === "undefined") return;
  const payload = {
    plan_date: row.plan_date,
    start_time: row.start_time,
    end_time: row.end_time,
    tasks: row.tasks,
    free_tasks: row.free_tasks,
    mode: row.mode,
    schedule_image_url: row.schedule_image_url,
    template_id: row.template_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  window.localStorage.setItem(
    localDailyPlanStorageKey(row.plan_date),
    JSON.stringify(payload),
  );
}

export type CreateDailyPlanInput = {
  plan_date: string;
  start_time: string;
  end_time: string;
  tasks?: DailyPlanTask[];
  free_tasks?: FreePlanTask[];
  mode?: PlanningMode;
  schedule_image_url?: string | null;
  template_id?: string | null;
};

export type UpdateDailyPlanInput = Partial<CreateDailyPlanInput>;

async function getCurrentUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("session") || msg.includes("jwt")) {
      throw new Error(
        "Your sign-in session is missing or expired. Please sign out and sign in again (use Google or Apple for cloud save).",
      );
    }
    throw error;
  }

  if (!data.user) {
    throw new Error(
      "You must be signed in to save daily plans to the cloud. If you used “Bypass login”, your plan is saved only in this browser until you sign in with Google or Apple.",
    );
  }

  return data.user.id;
}

function readAllLocalDailyPlansInRange(from: string, to: string): DailyPlan[] {
  if (typeof window === "undefined") return [];
  const plans: DailyPlan[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(LOCAL_DAILY_PLAN_STORAGE_PREFIX)) continue;
    const planDate = key.slice(LOCAL_DAILY_PLAN_STORAGE_PREFIX.length);
    if (planDate < from || planDate > to) continue;
    const plan = readLocalDailyPlan(planDate);
    if (plan) plans.push(plan);
  }
  return plans.sort((a, b) => a.plan_date.localeCompare(b.plan_date));
}

export const dailyPlansRepository = {
  async getAll(): Promise<DailyPlan[]> {
    if (isBrowserLocalDailyPlansMode()) {
      return [];
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("daily_plans")
      .select("*")
      .order("plan_date", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as DailyPlan[]).map(withNormalizedTasks);
  },

  async getByDate(planDate: string): Promise<DailyPlan | null> {
    if (isBrowserLocalDailyPlansMode()) {
      return readLocalDailyPlan(planDate);
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("daily_plans")
      .select("*")
      .eq("plan_date", planDate)
      .maybeSingle();

    if (error) throw error;
    const row = (data as DailyPlan | null) ?? null;
    return row ? withNormalizedTasks(row) : null;
  },

  async getRange(from: string, to: string): Promise<DailyPlan[]> {
    if (isBrowserLocalDailyPlansMode()) {
      return readAllLocalDailyPlansInRange(from, to);
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("daily_plans")
      .select("*")
      .gte("plan_date", from)
      .lte("plan_date", to)
      .order("plan_date", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as DailyPlan[]).map(withNormalizedTasks);
  },

  async create(input: CreateDailyPlanInput): Promise<DailyPlan> {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("daily_plans")
      .insert({
        ...input,
        user_id: userId,
        tasks: input.tasks ?? [],
      })
      .select()
      .single();

    if (error) throw error;
    return withNormalizedTasks(data as DailyPlan);
  },

  async update(id: string, input: UpdateDailyPlanInput): Promise<DailyPlan> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("daily_plans")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return withNormalizedTasks(data as DailyPlan);
  },

  async upsertByDate(input: CreateDailyPlanInput): Promise<DailyPlan> {
    if (isBrowserLocalDailyPlansMode()) {
      const now = new Date().toISOString();
      const existing = readLocalDailyPlan(input.plan_date);
      const row = withNormalizedTasks({
        id: existing?.id ?? `local:${input.plan_date}`,
        user_id: existing?.user_id ?? "00000000-0000-0000-0000-000000000000",
        plan_date: input.plan_date,
        start_time: input.start_time,
        end_time: input.end_time,
        tasks: input.tasks ?? existing?.tasks ?? [],
        free_tasks: input.free_tasks ?? existing?.free_tasks ?? [],
        mode: input.mode ?? existing?.mode ?? "time-block",
        schedule_image_url: input.schedule_image_url ?? null,
        template_id: input.template_id ?? null,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      } as DailyPlan);
      writeLocalDailyPlan(row);
      return row;
    }
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const now = new Date().toISOString();

    // Build a partial payload so callers updating only one mode's data don't clobber the other.
    type UpsertPayload = {
      user_id: string;
      plan_date: string;
      start_time: string;
      end_time: string;
      schedule_image_url: string | null;
      template_id: string | null;
      updated_at: string;
      tasks?: DailyPlanTask[];
      free_tasks?: FreePlanTask[];
      mode?: PlanningMode;
    };
    const payload: UpsertPayload = {
      user_id: userId,
      plan_date: input.plan_date,
      start_time: input.start_time,
      end_time: input.end_time,
      schedule_image_url: input.schedule_image_url ?? null,
      template_id: input.template_id ?? null,
      updated_at: now,
    };
    if (input.tasks !== undefined) payload.tasks = input.tasks;
    if (input.free_tasks !== undefined) payload.free_tasks = input.free_tasks;
    if (input.mode !== undefined) payload.mode = input.mode;

    const { data, error } = await supabase
      .from("daily_plans")
      .upsert(payload, { onConflict: "user_id,plan_date" })
      .select()
      .single();

    if (error) throw error;
    return withNormalizedTasks(data as DailyPlan);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("daily_plans").delete().eq("id", id);
    if (error) throw error;
  },
};
