import { createClient } from "@/lib/supabase/client";
import type {
  FocusSessionStatus,
  FocusSessionType,
  PlannerFocusSession,
  PlannerFocusSessionCompletionState,
} from "@/types/database";
import { getCurrentUserId, LOCAL_DEV_USER_ID } from "./current-user";
import {
  createLocalId,
  isBrowserLocalFocusRealityMode,
  isRecord,
  nowIso,
  readLocalJson,
  safeNullableString,
  safeNumber,
  safeString,
  safeStringArray,
  writeLocalJson,
} from "./focus-reality-local";

const LOCAL_SESSIONS_PREFIX = "mylifeos:planner-focus-sessions:v1:";

const SESSION_TYPES: readonly FocusSessionType[] = [
  "deep_work",
  "admin",
  "learning",
  "creative",
  "meeting",
  "recovery",
  "personal",
];

const SESSION_STATUSES: readonly FocusSessionStatus[] = [
  "planned",
  "running",
  "paused",
  "completed",
  "abandoned",
];

const COMPLETION_STATES: readonly PlannerFocusSessionCompletionState[] = [
  "completed",
  "partial",
  "not_completed",
];

export type CreatePlannerFocusSessionInput = {
  daily_plan_id?: string | null;
  planner_task_id?: string | null;
  task_id?: string | null;
  project_id?: string | null;
  plan_date: string;
  task_title: string;
  session_type?: FocusSessionType;
  status?: FocusSessionStatus;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  actual_start_at?: string | null;
  actual_end_at?: string | null;
  win_condition?: string | null;
  allowed_tools?: string[];
  blocked_routes?: string[];
  blocked_domains?: string[];
  energy_before?: number | null;
};

export type FinishPlannerFocusSessionInput = {
  energy_after?: number | null;
  focus_rating?: number | null;
  completion_state?: PlannerFocusSessionCompletionState | null;
  completion_note?: string | null;
  interruption_count?: number;
  stimulation_leak_count?: number;
  actual_end_at?: string | null;
};

function localSessionsKey(planDate: string): string {
  return `${LOCAL_SESSIONS_PREFIX}${planDate}`;
}

function isValidSessionType(value: unknown): value is FocusSessionType {
  return typeof value === "string" && SESSION_TYPES.includes(value as FocusSessionType);
}

function isValidStatus(value: unknown): value is FocusSessionStatus {
  return typeof value === "string" && SESSION_STATUSES.includes(value as FocusSessionStatus);
}

function isValidCompletionState(
  value: unknown,
): value is PlannerFocusSessionCompletionState {
  return typeof value === "string" && COMPLETION_STATES.includes(value as PlannerFocusSessionCompletionState);
}

function boundedOneToFive(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return rounded >= 1 && rounded <= 5 ? rounded : null;
}

export function normalizePlannerFocusSession(value: unknown): PlannerFocusSession | null {
  if (!isRecord(value)) return null;
  const planDate = safeString(value.plan_date);
  const taskTitle = safeString(value.task_title);
  if (!planDate || !taskTitle) return null;
  const status = isValidStatus(value.status) ? value.status : "planned";
  const sessionType = isValidSessionType(value.session_type) ? value.session_type : "deep_work";
  return {
    id: safeString(value.id, createLocalId("focus-session")),
    user_id: safeString(value.user_id, LOCAL_DEV_USER_ID),
    daily_plan_id: safeNullableString(value.daily_plan_id),
    planner_task_id: safeNullableString(value.planner_task_id),
    task_id: safeNullableString(value.task_id),
    project_id: safeNullableString(value.project_id),
    plan_date: planDate,
    task_title: taskTitle,
    session_type: sessionType,
    status,
    planned_start_at: safeNullableString(value.planned_start_at),
    planned_end_at: safeNullableString(value.planned_end_at),
    actual_start_at: safeNullableString(value.actual_start_at),
    actual_end_at: safeNullableString(value.actual_end_at),
    win_condition: safeNullableString(value.win_condition),
    allowed_tools: safeStringArray(value.allowed_tools),
    blocked_routes: safeStringArray(value.blocked_routes),
    blocked_domains: safeStringArray(value.blocked_domains),
    interruption_count: Math.max(0, Math.round(safeNumber(value.interruption_count, 0))),
    stimulation_leak_count: Math.max(0, Math.round(safeNumber(value.stimulation_leak_count, 0))),
    energy_before: boundedOneToFive(value.energy_before),
    energy_after: boundedOneToFive(value.energy_after),
    focus_rating: boundedOneToFive(value.focus_rating),
    completion_state: isValidCompletionState(value.completion_state)
      ? value.completion_state
      : null,
    completion_note: safeNullableString(value.completion_note),
    created_at: safeString(value.created_at, nowIso()),
    updated_at: safeString(value.updated_at, nowIso()),
  };
}

function normalizeSessionList(value: unknown): PlannerFocusSession[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizePlannerFocusSession)
    .filter((session): session is PlannerFocusSession => session !== null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function readLocalSessions(planDate: string): PlannerFocusSession[] {
  return readLocalJson(localSessionsKey(planDate), [], normalizeSessionList);
}

function writeLocalSessions(planDate: string, sessions: PlannerFocusSession[]): PlannerFocusSession[] {
  writeLocalJson(localSessionsKey(planDate), sessions);
  return sessions;
}

function readAllLocalSessions(): PlannerFocusSession[] {
  if (typeof window === "undefined") return [];
  const sessions: PlannerFocusSession[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(LOCAL_SESSIONS_PREFIX)) continue;
    const planDate = key.slice(LOCAL_SESSIONS_PREFIX.length);
    sessions.push(...readLocalSessions(planDate));
  }
  return sessions.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function activeStatus(status: FocusSessionStatus): boolean {
  return status === "running" || status === "paused";
}

function sessionFromInput(
  input: CreatePlannerFocusSessionInput,
  userId: string,
): PlannerFocusSession {
  const now = nowIso();
  return {
    id: createLocalId("focus-session"),
    user_id: userId,
    daily_plan_id: input.daily_plan_id ?? null,
    planner_task_id: input.planner_task_id ?? null,
    task_id: input.task_id ?? null,
    project_id: input.project_id ?? null,
    plan_date: input.plan_date,
    task_title: input.task_title.trim() || "Focus session",
    session_type: input.session_type ?? "deep_work",
    status: input.status ?? "planned",
    planned_start_at: input.planned_start_at ?? null,
    planned_end_at: input.planned_end_at ?? null,
    actual_start_at: input.actual_start_at ?? null,
    actual_end_at: input.actual_end_at ?? null,
    win_condition: input.win_condition ?? null,
    allowed_tools: input.allowed_tools ?? [],
    blocked_routes: input.blocked_routes ?? [],
    blocked_domains: input.blocked_domains ?? [],
    interruption_count: 0,
    stimulation_leak_count: 0,
    energy_before: input.energy_before ?? null,
    energy_after: null,
    focus_rating: null,
    completion_state: null,
    completion_note: null,
    created_at: now,
    updated_at: now,
  };
}

function localCreate(input: CreatePlannerFocusSessionInput): PlannerFocusSession {
  const sessions = readLocalSessions(input.plan_date);
  if (input.status && activeStatus(input.status)) {
    const active = readAllLocalSessions().find((session) => activeStatus(session.status));
    if (active) throw new Error("A focus session is already running.");
  }
  const session = sessionFromInput(input, LOCAL_DEV_USER_ID);
  writeLocalSessions(input.plan_date, [...sessions, session]);
  return session;
}

function localUpdate(
  id: string,
  update: (session: PlannerFocusSession) => PlannerFocusSession,
): PlannerFocusSession {
  const all = readAllLocalSessions();
  const existing = all.find((session) => session.id === id);
  if (!existing) throw new Error("Focus session not found.");
  const planSessions = readLocalSessions(existing.plan_date);
  const next = planSessions.map((session) =>
    session.id === id ? update(session) : session,
  );
  writeLocalSessions(existing.plan_date, next);
  const updated = next.find((session) => session.id === id);
  if (!updated) throw new Error("Focus session not found.");
  return updated;
}

async function updateRemoteSession(
  id: string,
  data: Partial<PlannerFocusSession>,
): Promise<PlannerFocusSession> {
  const supabase = createClient();
  const userId = await getCurrentUserId();
  const { data: row, error } = await supabase
    .from("planner_focus_sessions")
    .update({ ...data, updated_at: nowIso() })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  const normalized = normalizePlannerFocusSession(row);
  if (!normalized) throw new Error("Invalid focus session response.");
  return normalized;
}

export const plannerFocusSessionsRepository = {
  async getForDate(planDate: string): Promise<PlannerFocusSession[]> {
    if (isBrowserLocalFocusRealityMode()) return readLocalSessions(planDate);
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("planner_focus_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_date", planDate)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return normalizeSessionList(data);
  },

  async getActive(): Promise<PlannerFocusSession | null> {
    if (isBrowserLocalFocusRealityMode()) {
      return readAllLocalSessions().find((session) => activeStatus(session.status)) ?? null;
    }
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("planner_focus_sessions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["running", "paused"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return normalizePlannerFocusSession(data);
  },

  async createPlannedOrRunning(
    input: CreatePlannerFocusSessionInput,
  ): Promise<PlannerFocusSession> {
    if (isBrowserLocalFocusRealityMode()) return localCreate(input);
    const supabase = createClient();
    const userId = await getCurrentUserId();
    if (input.status && activeStatus(input.status)) {
      const active = await this.getActive();
      if (active) throw new Error("A focus session is already running.");
    }
    const { data, error } = await supabase
      .from("planner_focus_sessions")
      .insert({
        user_id: userId,
        daily_plan_id: input.daily_plan_id ?? null,
        planner_task_id: input.planner_task_id ?? null,
        task_id: input.task_id ?? null,
        project_id: input.project_id ?? null,
        plan_date: input.plan_date,
        task_title: input.task_title,
        session_type: input.session_type ?? "deep_work",
        status: input.status ?? "planned",
        planned_start_at: input.planned_start_at ?? null,
        planned_end_at: input.planned_end_at ?? null,
        actual_start_at: input.actual_start_at ?? null,
        actual_end_at: input.actual_end_at ?? null,
        win_condition: input.win_condition ?? null,
        allowed_tools: input.allowed_tools ?? [],
        blocked_routes: input.blocked_routes ?? [],
        blocked_domains: input.blocked_domains ?? [],
        energy_before: input.energy_before ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    const normalized = normalizePlannerFocusSession(data);
    if (!normalized) throw new Error("Invalid focus session response.");
    return normalized;
  },

  async start(input: CreatePlannerFocusSessionInput): Promise<PlannerFocusSession> {
    return this.createPlannedOrRunning({
      ...input,
      status: "running",
      actual_start_at: input.actual_start_at ?? nowIso(),
    });
  },

  async pause(id: string): Promise<PlannerFocusSession> {
    if (isBrowserLocalFocusRealityMode()) {
      return localUpdate(id, (session) => ({
        ...session,
        status: "paused",
        updated_at: nowIso(),
      }));
    }
    return updateRemoteSession(id, { status: "paused" });
  },

  async resume(id: string): Promise<PlannerFocusSession> {
    if (isBrowserLocalFocusRealityMode()) {
      const active = readAllLocalSessions().find(
        (session) => session.id !== id && activeStatus(session.status),
      );
      if (active) throw new Error("A focus session is already running.");
      return localUpdate(id, (session) => ({
        ...session,
        status: "running",
        updated_at: nowIso(),
      }));
    }
    const active = await this.getActive();
    if (active && active.id !== id) throw new Error("A focus session is already running.");
    return updateRemoteSession(id, { status: "running" });
  },

  async complete(
    id: string,
    input: FinishPlannerFocusSessionInput,
  ): Promise<PlannerFocusSession> {
    const patch: Partial<PlannerFocusSession> = {
      status: "completed",
      actual_end_at: input.actual_end_at ?? nowIso(),
      energy_after: input.energy_after ?? null,
      focus_rating: input.focus_rating ?? null,
      completion_state: input.completion_state ?? "completed",
      completion_note: input.completion_note ?? null,
      ...(input.interruption_count != null
        ? { interruption_count: Math.max(0, input.interruption_count) }
        : {}),
      ...(input.stimulation_leak_count != null
        ? { stimulation_leak_count: Math.max(0, input.stimulation_leak_count) }
        : {}),
    };
    if (isBrowserLocalFocusRealityMode()) {
      return localUpdate(id, (session) => ({ ...session, ...patch, updated_at: nowIso() }));
    }
    return updateRemoteSession(id, patch);
  },

  async abandon(
    id: string,
    input: FinishPlannerFocusSessionInput = {},
  ): Promise<PlannerFocusSession> {
    const patch: Partial<PlannerFocusSession> = {
      status: "abandoned",
      actual_end_at: input.actual_end_at ?? nowIso(),
      energy_after: input.energy_after ?? null,
      focus_rating: input.focus_rating ?? null,
      completion_state: input.completion_state ?? "not_completed",
      completion_note: input.completion_note ?? null,
    };
    if (isBrowserLocalFocusRealityMode()) {
      return localUpdate(id, (session) => ({ ...session, ...patch, updated_at: nowIso() }));
    }
    return updateRemoteSession(id, patch);
  },

  async incrementInterruption(id: string): Promise<PlannerFocusSession> {
    if (isBrowserLocalFocusRealityMode()) {
      return localUpdate(id, (session) => ({
        ...session,
        interruption_count: session.interruption_count + 1,
        updated_at: nowIso(),
      }));
    }
    const active = await this.getActive();
    const current =
      active?.id === id ? active.interruption_count : 0;
    return updateRemoteSession(id, { interruption_count: current + 1 });
  },

  async incrementStimulationLeak(id: string): Promise<PlannerFocusSession> {
    if (isBrowserLocalFocusRealityMode()) {
      return localUpdate(id, (session) => ({
        ...session,
        stimulation_leak_count: session.stimulation_leak_count + 1,
        updated_at: nowIso(),
      }));
    }
    const active = await this.getActive();
    const current =
      active?.id === id ? active.stimulation_leak_count : 0;
    return updateRemoteSession(id, { stimulation_leak_count: current + 1 });
  },
};
