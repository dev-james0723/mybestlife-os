import { createClient } from "@/lib/supabase/client";
import type {
  PlannerStimulationEvent,
  PlannerStimulationEventType,
  StimulationDecision,
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
  writeLocalJson,
} from "./focus-reality-local";

const LOCAL_EVENTS_PREFIX = "mylifeos:planner-stimulation-events:v1:";

const EVENT_TYPES: readonly PlannerStimulationEventType[] = [
  "route_gate",
  "urge_surfing",
  "manual_interrupt",
  "focus_exit_attempt",
  "ai_access",
  "high_stimulation_route",
];

const DECISIONS: readonly StimulationDecision[] = [
  "returned_to_focus",
  "continued_intentionally",
  "captured_and_returned",
  "abandoned_session",
];

export type LogPlannerStimulationEventInput = {
  focus_session_id?: string | null;
  plan_date: string;
  event_type: PlannerStimulationEventType;
  route?: string | null;
  domain?: string | null;
  decision?: StimulationDecision | null;
  reason?: string | null;
  delay_seconds?: number;
};

function localEventsKey(planDate: string): string {
  return `${LOCAL_EVENTS_PREFIX}${planDate}`;
}

function isEventType(value: unknown): value is PlannerStimulationEventType {
  return typeof value === "string" && EVENT_TYPES.includes(value as PlannerStimulationEventType);
}

function isDecision(value: unknown): value is StimulationDecision {
  return typeof value === "string" && DECISIONS.includes(value as StimulationDecision);
}

export function normalizePlannerStimulationEvent(
  value: unknown,
): PlannerStimulationEvent | null {
  if (!isRecord(value)) return null;
  const planDate = safeString(value.plan_date);
  if (!planDate || !isEventType(value.event_type)) return null;
  return {
    id: safeString(value.id, createLocalId("stimulation-event")),
    user_id: safeString(value.user_id, LOCAL_DEV_USER_ID),
    focus_session_id: safeNullableString(value.focus_session_id),
    plan_date: planDate,
    event_type: value.event_type,
    route: safeNullableString(value.route),
    domain: safeNullableString(value.domain),
    decision: isDecision(value.decision) ? value.decision : null,
    reason: safeNullableString(value.reason),
    delay_seconds: Math.max(0, Math.round(safeNumber(value.delay_seconds, 0))),
    created_at: safeString(value.created_at, nowIso()),
  };
}

function normalizeEventList(value: unknown): PlannerStimulationEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizePlannerStimulationEvent)
    .filter((event): event is PlannerStimulationEvent => event !== null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function readLocalEvents(planDate: string): PlannerStimulationEvent[] {
  return readLocalJson(localEventsKey(planDate), [], normalizeEventList);
}

function writeLocalEvents(
  planDate: string,
  events: PlannerStimulationEvent[],
): PlannerStimulationEvent[] {
  writeLocalJson(localEventsKey(planDate), events);
  return events;
}

function createLocalEvent(input: LogPlannerStimulationEventInput): PlannerStimulationEvent {
  return {
    id: createLocalId("stimulation-event"),
    user_id: LOCAL_DEV_USER_ID,
    focus_session_id: input.focus_session_id ?? null,
    plan_date: input.plan_date,
    event_type: input.event_type,
    route: input.route ?? null,
    domain: input.domain ?? null,
    decision: input.decision ?? null,
    reason: input.reason ?? null,
    delay_seconds: Math.max(0, Math.round(input.delay_seconds ?? 0)),
    created_at: nowIso(),
  };
}

export const plannerStimulationEventsRepository = {
  async log(input: LogPlannerStimulationEventInput): Promise<PlannerStimulationEvent> {
    if (isBrowserLocalFocusRealityMode()) {
      const events = readLocalEvents(input.plan_date);
      const event = createLocalEvent(input);
      writeLocalEvents(input.plan_date, [...events, event]);
      return event;
    }

    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("planner_stimulation_events")
      .insert({
        user_id: userId,
        focus_session_id: input.focus_session_id ?? null,
        plan_date: input.plan_date,
        event_type: input.event_type,
        route: input.route ?? null,
        domain: input.domain ?? null,
        decision: input.decision ?? null,
        reason: input.reason ?? null,
        delay_seconds: Math.max(0, Math.round(input.delay_seconds ?? 0)),
      })
      .select()
      .single();
    if (error) throw error;
    const normalized = normalizePlannerStimulationEvent(data);
    if (!normalized) throw new Error("Invalid stimulation event response.");
    return normalized;
  },

  async getForDate(planDate: string): Promise<PlannerStimulationEvent[]> {
    if (isBrowserLocalFocusRealityMode()) return readLocalEvents(planDate);
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("planner_stimulation_events")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_date", planDate)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return normalizeEventList(data);
  },

  async getForSession(sessionId: string): Promise<PlannerStimulationEvent[]> {
    if (isBrowserLocalFocusRealityMode()) {
      return Object.values(
        typeof window === "undefined"
          ? {}
          : Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i))
              .filter((key): key is string => Boolean(key?.startsWith(LOCAL_EVENTS_PREFIX)))
              .reduce<Record<string, PlannerStimulationEvent[]>>((acc, key) => {
                const planDate = key.slice(LOCAL_EVENTS_PREFIX.length);
                acc[planDate] = readLocalEvents(planDate);
                return acc;
              }, {}),
      )
        .flat()
        .filter((event) => event.focus_session_id === sessionId);
    }
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("planner_stimulation_events")
      .select("*")
      .eq("user_id", userId)
      .eq("focus_session_id", sessionId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return normalizeEventList(data);
  },
};
