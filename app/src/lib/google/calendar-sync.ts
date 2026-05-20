import type { SupabaseClient } from "@supabase/supabase-js";
import type { calendar_v3 } from "googleapis";
import type { DailyPlan, DailyPlanTask } from "@/types/database";
import { coerceDailyPlanTasks, coercePlanningMode } from "@/lib/normalize-plan-tasks";
import { getGoogleCalendarClientForUser } from "@/lib/google/calendar-client";
import {
  buildEventsForTimeBlockPlan,
  freePlanTaskMatchesGooglePatch,
  freePlanTaskToGoogleEvent,
  getPlannerDateFromGoogleEvent,
  getPlannerModeFromGoogleEvent,
  getPlannerTaskIdFromGoogleEvent,
  googleFreePlanEventToPatch,
  googleTimedEventToPlannerPatch,
  isOurPlannerGoogleEvent,
  plannerTaskMatchesGooglePatch,
  resolvePlannerDateFromGoogleEvent,
} from "@/lib/google/calendar-encoding";
import { MYLIFEOS_SYNC_PROP_KEY } from "@/lib/google-calendar/constants";
import { planDateCleanupEndUtc, zonedWallClockToUtc } from "@/lib/google-calendar/zoned-time";
import { GOOGLE_SYNC_SOURCE } from "@/lib/google/calendar-types";
import { coerceFreePlanTasks, ensurePlannerTaskIds } from "@/lib/normalize-plan-tasks";
import { parseTimeToMinutes } from "@/lib/daily-planner/plan-schedule-math";
import {
  deleteTaskSyncRow,
  eventMeta,
  listTaskSyncForPlanDate,
  upsertTaskSyncFields,
} from "@/lib/google/calendar-task-sync";
import { updateGoogleCalendarSyncMeta } from "@/lib/google/calendar-connection-store";
import { buildConflictPayload, detectBidirectionalConflict } from "@/lib/google/calendar-conflicts";
import { listPlanDatesWithPendingCalendarSync } from "@/lib/google/calendar-retry";

const DEFAULT_BLOCK = 10;

export type SyncResult = {
  localPushed: number;
  remoteFetched: number;
  remoteMatched: number;
  remoteApplied: number;
  remoteIgnored: number;
  conflicts: number;
  errors: string[];
};

type ApplyEventResult = {
  applied: boolean;
  conflict?: boolean;
  ignored?: boolean;
  reason?: string;
};

export function isGoogleCalendarSyncGloballyEnabled(): boolean {
  const v = process.env.GOOGLE_CALENDAR_SYNC_ENABLED?.trim().toLowerCase();
  return v !== "false" && v !== "0";
}

async function loadPlannerProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ blockMinutes: number; timeZone: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("block_minutes, timezone")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    return { blockMinutes: DEFAULT_BLOCK, timeZone: "UTC" };
  }
  const bm =
    typeof data.block_minutes === "number" && Number.isFinite(data.block_minutes) && data.block_minutes > 0
      ? data.block_minutes
      : DEFAULT_BLOCK;
  const tz =
    typeof data.timezone === "string" && data.timezone.trim() && data.timezone.toLowerCase() !== "auto"
      ? data.timezone.trim()
      : "UTC";
  return { blockMinutes: bm, timeZone: tz };
}

async function findGoogleEventIdForPlannerTask(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  plannerTaskId: string,
): Promise<string | null> {
  const res = await calendar.events.list({
    calendarId,
    privateExtendedProperty: [`taskId=${plannerTaskId}`],
    maxResults: 10,
    singleEvents: true,
  });
  const items = res.data.items ?? [];
  const match = items.find(
    (ev) => getPlannerTaskIdFromGoogleEvent(ev) === plannerTaskId && isOurPlannerGoogleEvent(ev),
  );
  return match?.id ?? null;
}

async function upsertGoogleEventForTask(args: {
  calendar: calendar_v3.Calendar;
  calendarId: string;
  supabase: SupabaseClient;
  userId: string;
  plan: DailyPlan;
  plannerTaskId: string;
  eventBody: calendar_v3.Schema$Event;
  existingEventId: string | null;
}): Promise<{ eventId: string; etag: string | null; iCalUID: string | null; updated: string | null }> {
  const { calendar, calendarId, eventBody, existingEventId, plannerTaskId } = args;
  let eventId = existingEventId;
  if (!eventId) {
    eventId = await findGoogleEventIdForPlannerTask(args.calendar, calendarId, plannerTaskId);
  }
  if (eventId) {
    const updated = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: eventBody,
    });
    const d = updated.data;
    return {
      eventId: d.id ?? eventId,
      etag: d.etag ?? null,
      iCalUID: d.iCalUID ?? null,
      updated: d.updated ?? null,
    };
  }
  const created = await calendar.events.insert({
    calendarId,
    requestBody: eventBody,
  });
  const d = created.data;
  return {
    eventId: d.id ?? "",
    etag: d.etag ?? null,
    iCalUID: d.iCalUID ?? null,
    updated: d.updated ?? null,
  };
}

export async function pushPlannerPlanForDate(args: {
  supabase: SupabaseClient;
  userId: string;
  planDate: string;
}): Promise<{ ok: boolean; pushed: number; message?: string; syncedAt: string | null }> {
  if (!isGoogleCalendarSyncGloballyEnabled()) {
    return { ok: true, pushed: 0, message: "sync_disabled", syncedAt: null };
  }
  const { supabase, userId, planDate } = args;
  const { data: flags } = await supabase
    .from("google_calendar_connections")
    .select("sync_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (!flags?.sync_enabled) {
    return { ok: true, pushed: 0, message: "paused", syncedAt: null };
  }
  const client = await getGoogleCalendarClientForUser(supabase, userId);
  if (!client) {
    return { ok: true, pushed: 0, message: "not_connected", syncedAt: null };
  }
  const { calendar, calendarId } = client;
  const { data: planRow, error: planErr } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .maybeSingle();
  if (planErr || !planRow) {
    return { ok: true, pushed: 0, message: "no_plan", syncedAt: null };
  }
  const mode = coercePlanningMode(planRow.mode);
  if (mode === "free") {
    return pushFreePlanForDate({ supabase, userId, planDate });
  }
  let plan: DailyPlan = {
    ...(planRow as DailyPlan),
    tasks: coerceDailyPlanTasks(planRow.tasks),
  };
  const profile = await loadPlannerProfile(supabase, userId);
  const tasksWithIds = ensurePlannerTaskIds(plan.tasks);
  if (tasksWithIds !== plan.tasks) {
    await supabase
      .from("daily_plans")
      .update({ tasks: tasksWithIds, updated_at: new Date().toISOString() })
      .eq("id", plan.id);
    plan = { ...plan, tasks: tasksWithIds };
  }
  const built = buildEventsForTimeBlockPlan(plan.tasks, {
    planDate,
    planStartTime: plan.start_time,
    planId: plan.id,
    userId,
    timeZone: profile.timeZone,
    blockMinutes: profile.blockMinutes,
    notes: null,
  });
  const idSet = new Set(built.map((b) => b.plannerTaskId));
  const existingSync = await listTaskSyncForPlanDate(supabase, userId, planDate);
  for (const row of existingSync) {
    const pid = row.planner_task_id as string;
    if (!idSet.has(pid)) {
      const gid = row.google_event_id as string | null;
      if (gid) {
        try {
          await calendar.events.delete({ calendarId, eventId: gid });
        } catch {
          /* keep row for manual retry */
        }
      }
      await deleteTaskSyncRow(supabase, userId, pid);
    }
  }

  let pushed = 0;
  for (const item of built) {
    const syncRow = existingSync.find((r) => r.planner_task_id === item.plannerTaskId);
    try {
      const meta = await upsertGoogleEventForTask({
        calendar,
        calendarId,
        supabase,
        userId,
        plan,
        plannerTaskId: item.plannerTaskId,
        eventBody: item.event,
        existingEventId: (syncRow?.google_event_id as string | null) ?? null,
      });
      await upsertTaskSyncFields(supabase, {
        user_id: userId,
        daily_plan_id: plan.id,
        planner_task_id: item.plannerTaskId,
        plan_date: planDate,
        google_calendar_id: calendarId,
        google_event_id: meta.eventId,
        google_event_etag: meta.etag,
        google_event_ical_uid: meta.iCalUID,
        google_event_updated_at: meta.updated,
        local_last_modified_at: plan.updated_at,
        last_synced_at: new Date().toISOString(),
        last_sync_origin: "local",
        sync_status: "synced",
        sync_error_message: null,
        conflict_payload: null,
        google_duration_rounded: false,
      });
      pushed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "push_failed";
      await upsertTaskSyncFields(supabase, {
        user_id: userId,
        daily_plan_id: plan.id,
        planner_task_id: item.plannerTaskId,
        plan_date: planDate,
        google_calendar_id: calendarId,
        google_event_id: (syncRow?.google_event_id as string | null) ?? null,
        google_event_etag: (syncRow?.google_event_etag as string | null) ?? null,
        google_event_ical_uid: (syncRow?.google_event_ical_uid as string | null) ?? null,
        google_event_updated_at: (syncRow?.google_event_updated_at as string | null) ?? null,
        local_last_modified_at: plan.updated_at,
        last_synced_at: syncRow?.last_synced_at ?? null,
        last_sync_origin: "local",
        sync_status: "local_pending",
        sync_error_message: msg,
        conflict_payload: null,
        google_duration_rounded: false,
      });
    }
  }
  return { ok: true, pushed, syncedAt: new Date().toISOString() };
}

export async function runIncrementalGoogleCalendarSync(args: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ processed: number }> {
  if (!isGoogleCalendarSyncGloballyEnabled()) return { processed: 0 };
  const { data: flags } = await args.supabase
    .from("google_calendar_connections")
    .select("sync_enabled")
    .eq("user_id", args.userId)
    .maybeSingle();
  if (!flags?.sync_enabled) return { processed: 0 };
  const client = await getGoogleCalendarClientForUser(args.supabase, args.userId);
  if (!client) return { processed: 0 };
  const { calendar, calendarId } = client;
  const { data: connRow } = await args.supabase
    .from("google_calendar_connections")
    .select("sync_token")
    .eq("user_id", args.userId)
    .maybeSingle();
  const syncToken = (connRow?.sync_token as string | null) ?? undefined;
  if (!syncToken) {
    return runFullGoogleCalendarSync(args);
  }
  let pageToken: string | undefined;
  let nextSync: string | null = null;
  const collected: calendar_v3.Schema$Event[] = [];
  let needFull = false;
  try {
    do {
      const res = await calendar.events.list({
        calendarId,
        syncToken,
        pageToken,
        singleEvents: true,
        showDeleted: true,
        maxResults: 250,
      });
      collected.push(...(res.data.items ?? []));
      pageToken = res.data.nextPageToken ?? undefined;
      if (res.data.nextSyncToken) nextSync = res.data.nextSyncToken;
    } while (pageToken);
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? Number((e as { code?: number }).code) : NaN;
    if (code === 410) needFull = true;
    else {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("410")) needFull = true;
      else throw e;
    }
  }
  if (needFull) {
    await updateGoogleCalendarSyncMeta(args.supabase, args.userId, { sync_token: null });
    return runFullGoogleCalendarSync(args);
  }
  const profile = await loadPlannerProfile(args.supabase, args.userId);
  let processed = 0;
  for (const ev of collected) {
    if (!isOurPlannerGoogleEvent(ev)) continue;
    const result = await applySingleGoogleEvent({
      supabase: args.supabase,
      userId: args.userId,
      ev,
      blockMinutes: profile.blockMinutes,
      timeZone: profile.timeZone,
    });
    if (result.applied) processed++;
  }
  if (nextSync) {
    await updateGoogleCalendarSyncMeta(args.supabase, args.userId, {
      sync_token: nextSync,
      last_incremental_sync_at: new Date().toISOString(),
    });
  }
  return { processed };
}

export async function runFullGoogleCalendarSync(args: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ processed: number }> {
  if (!isGoogleCalendarSyncGloballyEnabled()) return { processed: 0 };
  const { data: flags } = await args.supabase
    .from("google_calendar_connections")
    .select("sync_enabled")
    .eq("user_id", args.userId)
    .maybeSingle();
  if (!flags?.sync_enabled) return { processed: 0 };
  const client = await getGoogleCalendarClientForUser(args.supabase, args.userId);
  if (!client) return { processed: 0 };
  const { calendar, calendarId } = client;
  const timeMin = new Date(Date.now() - 120 * 86400000).toISOString();
  let pageToken: string | undefined;
  let nextSync: string | null = null;
  const collected: calendar_v3.Schema$Event[] = [];
  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      singleEvents: true,
      showDeleted: true,
      maxResults: 250,
      pageToken,
    });
    collected.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
    if (res.data.nextSyncToken) nextSync = res.data.nextSyncToken;
  } while (pageToken);
  const profile = await loadPlannerProfile(args.supabase, args.userId);
  let processed = 0;
  for (const ev of collected) {
    if (!isOurPlannerGoogleEvent(ev)) continue;
    const result = await applySingleGoogleEvent({
      supabase: args.supabase,
      userId: args.userId,
      ev,
      blockMinutes: profile.blockMinutes,
      timeZone: profile.timeZone,
    });
    if (result.applied) processed++;
  }
  if (nextSync) {
    await updateGoogleCalendarSyncMeta(args.supabase, args.userId, {
      sync_token: nextSync,
      last_full_sync_at: new Date().toISOString(),
      last_incremental_sync_at: new Date().toISOString(),
    });
  }
  return { processed };
}

async function loadDailyPlanForDate(
  supabase: SupabaseClient,
  userId: string,
  planDate: string,
): Promise<DailyPlan | null> {
  const { data: planRow } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .maybeSingle();
  if (!planRow) return null;
  return {
    ...(planRow as DailyPlan),
    tasks: coerceDailyPlanTasks(planRow.tasks),
  };
}

async function applySingleGoogleEvent(args: {
  supabase: SupabaseClient;
  userId: string;
  ev: calendar_v3.Schema$Event;
  blockMinutes: number;
  timeZone: string;
  skipConflict?: boolean;
}): Promise<ApplyEventResult> {
  const { supabase, userId, ev, blockMinutes, timeZone, skipConflict } = args;
  const plannerTaskId = getPlannerTaskIdFromGoogleEvent(ev);
  if (!plannerTaskId) {
    return { applied: false, ignored: true, reason: "missing_planner_task_id" };
  }

  const plannerMode = getPlannerModeFromGoogleEvent(ev);
  if (plannerMode === "free") {
    return applyFreePlanGoogleEvent({
      supabase,
      userId,
      ev,
      plannerTaskId,
      timeZone,
      skipConflict: args.skipConflict,
    });
  }

  const { data: connMeta } = await supabase
    .from("google_calendar_connections")
    .select("calendar_id")
    .eq("user_id", userId)
    .maybeSingle();
  const googleCalId = (connMeta?.calendar_id as string) || "primary";

  const { data: syncRow } = await supabase
    .from("calendar_task_sync")
    .select("*")
    .eq("user_id", userId)
    .eq("planner_task_id", plannerTaskId)
    .maybeSingle();

  const resolvedPlanDate = resolvePlannerDateFromGoogleEvent(ev, timeZone);
  const legacyPrivatePlanDate = getPlannerDateFromGoogleEvent(ev);
  const anchorPlanDate =
    (syncRow?.plan_date as string | undefined) ?? legacyPrivatePlanDate ?? resolvedPlanDate ?? null;
  if (!anchorPlanDate || !resolvedPlanDate) {
    return { applied: false, ignored: true, reason: "missing_plan_date" };
  }

  const meta = eventMeta(ev);

  if (ev.status === "cancelled") {
    await upsertTaskSyncFields(supabase, {
      user_id: userId,
      daily_plan_id: (syncRow?.daily_plan_id as string | null) ?? null,
      planner_task_id: plannerTaskId,
      plan_date: anchorPlanDate,
      google_calendar_id: googleCalId,
      google_event_id: ev.id ?? null,
      google_event_etag: ev.etag ?? null,
      google_event_ical_uid: ev.iCalUID ?? null,
      google_event_updated_at: ev.updated ?? null,
      local_last_modified_at: null,
      last_synced_at: new Date().toISOString(),
      last_sync_origin: "google",
      sync_status: "remote_deleted",
      sync_error_message: null,
      conflict_payload: null,
    });
    return { applied: false, ignored: true, reason: "remote_deleted" };
  }

  if (ev.start?.date && !ev.start?.dateTime) {
    await upsertTaskSyncFields(supabase, {
      user_id: userId,
      daily_plan_id: (syncRow?.daily_plan_id as string | null) ?? null,
      planner_task_id: plannerTaskId,
      plan_date: anchorPlanDate,
      google_calendar_id: googleCalId,
      google_event_id: ev.id ?? null,
      google_event_etag: meta.etag,
      google_event_ical_uid: meta.iCalUID,
      google_event_updated_at: meta.updated,
      local_last_modified_at: null,
      last_synced_at: syncRow?.last_synced_at ?? null,
      last_sync_origin: "google",
      sync_status: "conflict",
      sync_error_message: "google_all_day_event",
      conflict_payload: buildConflictPayload(
        { plannerTaskId, note: "all_day" },
        { summary: ev.summary, start: ev.start, end: ev.end },
      ),
    });
    return { applied: false, conflict: true };
  }

  let plan =
    (await loadDailyPlanForDate(supabase, userId, anchorPlanDate)) ??
    (resolvedPlanDate !== anchorPlanDate
      ? await loadDailyPlanForDate(supabase, userId, resolvedPlanDate)
      : null);
  if (!plan) {
    return { applied: false, ignored: true, reason: "no_local_plan" };
  }

  let sorted = [...plan.tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  let idx = sorted.findIndex((t) => t.plannerTaskId === plannerTaskId);
  if (idx < 0 && resolvedPlanDate !== plan.plan_date) {
    const alt = await loadDailyPlanForDate(supabase, userId, resolvedPlanDate);
    if (alt) {
      plan = alt;
      sorted = [...plan.tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      idx = sorted.findIndex((t) => t.plannerTaskId === plannerTaskId);
    }
  }
  if (idx < 0) {
    return { applied: false, ignored: true, reason: "task_not_on_plan" };
  }

  const isCrossDayMove = resolvedPlanDate !== plan.plan_date;

  if (isCrossDayMove) {
    const destPlan = await loadDailyPlanForDate(supabase, userId, resolvedPlanDate);
    if (!destPlan) {
      await upsertTaskSyncFields(supabase, {
        user_id: userId,
        daily_plan_id: plan.id,
        planner_task_id: plannerTaskId,
        plan_date: anchorPlanDate,
        google_calendar_id: googleCalId,
        google_event_id: ev.id ?? null,
        google_event_etag: meta.etag,
        google_event_ical_uid: meta.iCalUID,
        google_event_updated_at: meta.updated,
        local_last_modified_at: plan.updated_at,
        last_synced_at: syncRow?.last_synced_at ?? null,
        last_sync_origin: "google",
        sync_status: "error",
        sync_error_message: "missing_target_plan_row",
        conflict_payload: null,
      });
      return { applied: false, ignored: true, reason: "missing_target_plan_row" };
    }

    const taskToMove = sorted[idx];
    const oldFiltered = sorted
      .filter((t) => t.plannerTaskId !== plannerTaskId)
      .map((t, i) => ({ ...t, order: i }));

    const destSorted = [...destPlan.tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const planStartMinDest = parseTimeToMinutes(destPlan.start_time);
    let previousEndDest = planStartMinDest;
    for (const t of destSorted) {
      previousEndDest += (t.gapBlocks ?? 0) * blockMinutes + (t.blocks ?? 1) * blockMinutes;
    }
    const patchMove = googleTimedEventToPlannerPatch(ev, {
      planDate: resolvedPlanDate,
      timeZone,
      planStartMin: planStartMinDest,
      blockMinutes,
      previousEndMin: previousEndDest,
    });

    const migrated: DailyPlanTask = {
      ...taskToMove,
      ...(patchMove.taskName ? { taskName: patchMove.taskName } : {}),
      ...(patchMove.blocks != null ? { blocks: patchMove.blocks } : {}),
      ...(patchMove.gapBlocks != null ? { gapBlocks: patchMove.gapBlocks } : {}),
      ...(patchMove.start_time ? { start_time: patchMove.start_time } : {}),
      ...(patchMove.end_time ? { end_time: patchMove.end_time } : {}),
      order: destSorted.length,
    };
    const newDestTasks = [...destSorted.map((t, i) => ({ ...t, order: i })), migrated];

    const conflictMove = detectBidirectionalConflict({
      planRowUpdatedAt: plan.updated_at,
      lastSyncedAt: (syncRow?.last_synced_at as string | null) ?? null,
      googleEventUpdated: meta.updated,
      googleEtagChanged: !!meta.etag && meta.etag !== (syncRow?.google_event_etag as string | null),
    });
    if (conflictMove && !skipConflict) {
      await upsertTaskSyncFields(supabase, {
        user_id: userId,
        daily_plan_id: plan.id,
        planner_task_id: plannerTaskId,
        plan_date: anchorPlanDate,
        google_calendar_id: googleCalId,
        google_event_id: ev.id ?? null,
        google_event_etag: meta.etag,
        google_event_ical_uid: meta.iCalUID,
        google_event_updated_at: meta.updated,
        local_last_modified_at: plan.updated_at,
        last_synced_at: syncRow?.last_synced_at ?? null,
        last_sync_origin: "google",
        sync_status: "conflict",
        sync_error_message: null,
        conflict_payload: buildConflictPayload(
          { task: taskToMove, planUpdatedAt: plan.updated_at },
          { summary: ev.summary, start: ev.start, end: ev.end },
        ),
      });
      return { applied: false, conflict: true };
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("daily_plans")
      .update({ tasks: oldFiltered, updated_at: nowIso })
      .eq("id", plan.id);
    await supabase
      .from("daily_plans")
      .update({ tasks: newDestTasks, updated_at: nowIso })
      .eq("id", destPlan.id);

    await upsertTaskSyncFields(supabase, {
      user_id: userId,
      daily_plan_id: destPlan.id,
      planner_task_id: plannerTaskId,
      plan_date: resolvedPlanDate,
      google_calendar_id: googleCalId,
      google_event_id: ev.id ?? null,
      google_event_etag: meta.etag,
      google_event_ical_uid: meta.iCalUID,
      google_event_updated_at: meta.updated,
      local_last_modified_at: nowIso,
      last_synced_at: nowIso,
      last_sync_origin: "google",
      sync_status: "synced",
      sync_error_message: null,
      conflict_payload: null,
      google_duration_rounded: !!patchMove.googleDurationRounded,
    });
    return { applied: true };
  }

  const planDate = plan.plan_date;
  const planStartMin = parseTimeToMinutes(plan.start_time);
  let previousEnd = planStartMin;
  for (let i = 0; i < idx; i++) {
    const g = (sorted[i].gapBlocks ?? 0) * blockMinutes;
    const b = (sorted[i].blocks ?? 1) * blockMinutes;
    previousEnd += g + b;
  }

  const patch = googleTimedEventToPlannerPatch(ev, {
    planDate,
    timeZone,
    planStartMin,
    blockMinutes,
    previousEndMin: previousEnd,
  });

  const etagUnchanged =
    !!meta.etag && meta.etag === (syncRow?.google_event_etag as string | null);
  if (etagUnchanged && plannerTaskMatchesGooglePatch(sorted[idx], patch)) {
    await upsertTaskSyncFields(supabase, {
      user_id: userId,
      daily_plan_id: plan.id,
      planner_task_id: plannerTaskId,
      plan_date: planDate,
      google_calendar_id: googleCalId,
      google_event_id: ev.id ?? null,
      google_event_etag: meta.etag,
      google_event_ical_uid: meta.iCalUID,
      google_event_updated_at: meta.updated,
      local_last_modified_at: plan.updated_at,
      last_synced_at: new Date().toISOString(),
      last_sync_origin: "google",
      sync_status: "synced",
      sync_error_message: null,
      conflict_payload: null,
      google_duration_rounded: !!patch.googleDurationRounded,
    });
    return { applied: false, ignored: true, reason: "already_synced" };
  }

  const conflict = detectBidirectionalConflict({
    planRowUpdatedAt: plan.updated_at,
    lastSyncedAt: (syncRow?.last_synced_at as string | null) ?? null,
    googleEventUpdated: meta.updated,
    googleEtagChanged: !!meta.etag && meta.etag !== (syncRow?.google_event_etag as string | null),
  });

  if (conflict && !skipConflict) {
    await upsertTaskSyncFields(supabase, {
      user_id: userId,
      daily_plan_id: plan.id,
      planner_task_id: plannerTaskId,
      plan_date: planDate,
      google_calendar_id: googleCalId,
      google_event_id: ev.id ?? null,
      google_event_etag: meta.etag,
      google_event_ical_uid: meta.iCalUID,
      google_event_updated_at: meta.updated,
      local_last_modified_at: plan.updated_at,
      last_synced_at: syncRow?.last_synced_at ?? null,
      last_sync_origin: "google",
      sync_status: "conflict",
      sync_error_message: null,
      conflict_payload: buildConflictPayload(
        { task: sorted[idx], planUpdatedAt: plan.updated_at },
        { summary: ev.summary, start: ev.start, end: ev.end },
      ),
    });
    return { applied: false, conflict: true };
  }

  const nextTasks: DailyPlanTask[] = sorted.map((t, i) => {
    if (i !== idx) return { ...t, order: i };
    return {
      ...t,
      ...(patch.taskName ? { taskName: patch.taskName } : {}),
      ...(patch.blocks != null ? { blocks: patch.blocks } : {}),
      ...(patch.gapBlocks != null ? { gapBlocks: patch.gapBlocks } : {}),
      ...(patch.start_time ? { start_time: patch.start_time } : {}),
      ...(patch.end_time ? { end_time: patch.end_time } : {}),
      google_calendar_event_id: ev.id ?? t.google_calendar_event_id,
      google_calendar_etag: meta.etag ?? undefined,
      google_calendar_updated_at: meta.updated ?? undefined,
      order: i,
    };
  });

  await supabase
    .from("daily_plans")
    .update({
      tasks: nextTasks,
      updated_at: new Date().toISOString(),
    })
    .eq("id", plan.id);

  await upsertTaskSyncFields(supabase, {
    user_id: userId,
    daily_plan_id: plan.id,
    planner_task_id: plannerTaskId,
    plan_date: planDate,
    google_calendar_id: googleCalId,
    google_event_id: ev.id ?? null,
    google_event_etag: meta.etag,
    google_event_ical_uid: meta.iCalUID,
    google_event_updated_at: meta.updated,
    local_last_modified_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    last_sync_origin: "google",
    sync_status: "synced",
    sync_error_message: null,
    conflict_payload: null,
    google_duration_rounded: !!patch.googleDurationRounded,
  });
  return { applied: true };
}

async function applyFreePlanGoogleEvent(args: {
  supabase: SupabaseClient;
  userId: string;
  ev: calendar_v3.Schema$Event;
  plannerTaskId: string;
  timeZone: string;
  skipConflict?: boolean;
}): Promise<ApplyEventResult> {
  const { supabase, userId, ev, plannerTaskId, timeZone, skipConflict } = args;
  const resolvedPlanDate = resolvePlannerDateFromGoogleEvent(ev, timeZone);
  if (!resolvedPlanDate) {
    return { applied: false, ignored: true, reason: "missing_plan_date" };
  }

  const { data: connMeta } = await supabase
    .from("google_calendar_connections")
    .select("calendar_id")
    .eq("user_id", userId)
    .maybeSingle();
  const googleCalId = (connMeta?.calendar_id as string) || "primary";

  const { data: syncRow } = await supabase
    .from("calendar_task_sync")
    .select("*")
    .eq("user_id", userId)
    .eq("planner_task_id", plannerTaskId)
    .maybeSingle();

  const meta = eventMeta(ev);

  if (ev.status === "cancelled") {
    await upsertTaskSyncFields(supabase, {
      user_id: userId,
      daily_plan_id: (syncRow?.daily_plan_id as string | null) ?? null,
      planner_task_id: plannerTaskId,
      plan_date: (syncRow?.plan_date as string) ?? resolvedPlanDate,
      google_calendar_id: googleCalId,
      google_event_id: ev.id ?? null,
      google_event_etag: ev.etag ?? null,
      google_event_ical_uid: ev.iCalUID ?? null,
      google_event_updated_at: ev.updated ?? null,
      local_last_modified_at: null,
      last_synced_at: new Date().toISOString(),
      last_sync_origin: "google",
      sync_status: "remote_deleted",
      sync_error_message: null,
      conflict_payload: null,
    });
    return { applied: false, ignored: true, reason: "remote_deleted" };
  }

  const plan = await loadDailyPlanForDate(supabase, userId, resolvedPlanDate);
  if (!plan) {
    return { applied: false, ignored: true, reason: "no_local_plan" };
  }

  const freeTasks = coerceFreePlanTasks(plan.free_tasks);
  const idx = freeTasks.findIndex((t) => t.id === plannerTaskId);
  if (idx < 0) {
    return { applied: false, ignored: true, reason: "free_task_not_on_plan" };
  }

  const patch = googleFreePlanEventToPatch(ev);
  const etagUnchanged =
    !!meta.etag && meta.etag === (syncRow?.google_event_etag as string | null);
  if (etagUnchanged && freePlanTaskMatchesGooglePatch(freeTasks[idx], patch)) {
    return { applied: false, ignored: true, reason: "already_synced" };
  }

  const conflict = detectBidirectionalConflict({
    planRowUpdatedAt: plan.updated_at,
    lastSyncedAt: (syncRow?.last_synced_at as string | null) ?? null,
    googleEventUpdated: meta.updated,
    googleEtagChanged: !!meta.etag && meta.etag !== (syncRow?.google_event_etag as string | null),
  });
  if (conflict && !skipConflict) {
    await upsertTaskSyncFields(supabase, {
      user_id: userId,
      daily_plan_id: plan.id,
      planner_task_id: plannerTaskId,
      plan_date: plan.plan_date,
      google_calendar_id: googleCalId,
      google_event_id: ev.id ?? null,
      google_event_etag: meta.etag,
      google_event_ical_uid: meta.iCalUID,
      google_event_updated_at: meta.updated,
      local_last_modified_at: plan.updated_at,
      last_synced_at: syncRow?.last_synced_at ?? null,
      last_sync_origin: "google",
      sync_status: "conflict",
      sync_error_message: null,
      conflict_payload: buildConflictPayload(
        { task: freeTasks[idx], planUpdatedAt: plan.updated_at },
        { summary: ev.summary, description: ev.description },
      ),
    });
    return { applied: false, conflict: true };
  }

  const nextFree = freeTasks.map((t, i) => {
    if (i !== idx) return t;
    return {
      ...t,
      ...(patch.title ? { title: patch.title } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    };
  });

  const nowIso = new Date().toISOString();
  await supabase
    .from("daily_plans")
    .update({ free_tasks: nextFree, updated_at: nowIso })
    .eq("id", plan.id);

  await upsertTaskSyncFields(supabase, {
    user_id: userId,
    daily_plan_id: plan.id,
    planner_task_id: plannerTaskId,
    plan_date: plan.plan_date,
    google_calendar_id: googleCalId,
    google_event_id: ev.id ?? null,
    google_event_etag: meta.etag,
    google_event_ical_uid: meta.iCalUID,
    google_event_updated_at: meta.updated,
    local_last_modified_at: nowIso,
    last_synced_at: nowIso,
    last_sync_origin: "google",
    sync_status: "synced",
    sync_error_message: null,
    conflict_payload: null,
  });
  return { applied: true };
}

export async function pushFreePlanForDate(args: {
  supabase: SupabaseClient;
  userId: string;
  planDate: string;
}): Promise<{ ok: boolean; pushed: number; message?: string; syncedAt: string | null }> {
  if (!isGoogleCalendarSyncGloballyEnabled()) {
    return { ok: true, pushed: 0, message: "sync_disabled", syncedAt: null };
  }
  const { supabase, userId, planDate } = args;
  const { data: flags } = await supabase
    .from("google_calendar_connections")
    .select("sync_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (!flags?.sync_enabled) {
    return { ok: true, pushed: 0, message: "paused", syncedAt: null };
  }
  const client = await getGoogleCalendarClientForUser(supabase, userId);
  if (!client) {
    return { ok: true, pushed: 0, message: "not_connected", syncedAt: null };
  }
  const { calendar, calendarId } = client;
  const { data: planRow, error: planErr } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .maybeSingle();
  if (planErr || !planRow) {
    return { ok: true, pushed: 0, message: "no_plan", syncedAt: null };
  }
  const plan: DailyPlan = {
    ...(planRow as DailyPlan),
    free_tasks: coerceFreePlanTasks(planRow.free_tasks),
  };
  const profile = await loadPlannerProfile(supabase, userId);
  const freeTasks = plan.free_tasks;
  const idSet = new Set(freeTasks.map((t) => t.id));
  const existingSync = await listTaskSyncForPlanDate(supabase, userId, planDate);
  for (const row of existingSync) {
    const pid = row.planner_task_id as string;
    if (!idSet.has(pid)) {
      const gid = row.google_event_id as string | null;
      if (gid) {
        try {
          await calendar.events.delete({ calendarId, eventId: gid });
        } catch {
          /* retry later */
        }
      }
      await deleteTaskSyncRow(supabase, userId, pid);
    }
  }

  let pushed = 0;
  for (const task of freeTasks) {
    const syncRow = existingSync.find((r) => r.planner_task_id === task.id);
    const eventBody = freePlanTaskToGoogleEvent(task, {
      planDate,
      planId: plan.id,
      userId,
      timeZone: profile.timeZone,
    });
    try {
      const meta = await upsertGoogleEventForTask({
        calendar,
        calendarId,
        supabase,
        userId,
        plan,
        plannerTaskId: task.id,
        eventBody,
        existingEventId: (syncRow?.google_event_id as string | null) ?? null,
      });
      await upsertTaskSyncFields(supabase, {
        user_id: userId,
        daily_plan_id: plan.id,
        planner_task_id: task.id,
        plan_date: planDate,
        google_calendar_id: calendarId,
        google_event_id: meta.eventId,
        google_event_etag: meta.etag,
        google_event_ical_uid: meta.iCalUID,
        google_event_updated_at: meta.updated,
        local_last_modified_at: plan.updated_at,
        last_synced_at: new Date().toISOString(),
        last_sync_origin: "local",
        sync_status: "synced",
        sync_error_message: null,
        conflict_payload: null,
      });
      pushed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "push_failed";
      await upsertTaskSyncFields(supabase, {
        user_id: userId,
        daily_plan_id: plan.id,
        planner_task_id: task.id,
        plan_date: planDate,
        google_calendar_id: calendarId,
        google_event_id: (syncRow?.google_event_id as string | null) ?? null,
        sync_status: "local_pending",
        sync_error_message: msg,
        conflict_payload: null,
        last_sync_origin: "local",
        local_last_modified_at: plan.updated_at,
        last_synced_at: syncRow?.last_synced_at ?? null,
        google_event_etag: (syncRow?.google_event_etag as string | null) ?? null,
        google_event_ical_uid: (syncRow?.google_event_ical_uid as string | null) ?? null,
        google_event_updated_at: (syncRow?.google_event_updated_at as string | null) ?? null,
      });
    }
  }
  return { ok: true, pushed, syncedAt: new Date().toISOString() };
}

async function cleanupLegacyPlanDateOnlyEvents(args: {
  calendar: calendar_v3.Calendar;
  calendarId: string;
  planDate: string;
  timeZone: string;
}): Promise<number> {
  const { calendar, calendarId, planDate, timeZone } = args;
  const timeMin = zonedWallClockToUtc(planDate, 0, 0, timeZone).toISOString();
  const timeMax = planDateCleanupEndUtc(planDate, timeZone);
  const propFilter = `${MYLIFEOS_SYNC_PROP_KEY}=${planDate}`;
  let removed = 0;
  let pageToken: string | undefined;
  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      privateExtendedProperty: [propFilter],
      maxResults: 250,
      pageToken,
    });
    for (const ev of res.data.items ?? []) {
      if (getPlannerTaskIdFromGoogleEvent(ev)) continue;
      if (!ev.id) continue;
      try {
        await calendar.events.delete({ calendarId, eventId: ev.id });
        removed++;
      } catch {
        /* skip */
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return removed;
}

export async function pullGoogleEventsForPlanDate(args: {
  supabase: SupabaseClient;
  userId: string;
  planDate: string;
  timeZone: string;
}): Promise<Pick<SyncResult, "remoteFetched" | "remoteMatched" | "remoteApplied" | "remoteIgnored" | "conflicts">> {
  const client = await getGoogleCalendarClientForUser(args.supabase, args.userId);
  if (!client) {
    return { remoteFetched: 0, remoteMatched: 0, remoteApplied: 0, remoteIgnored: 0, conflicts: 0 };
  }
  const { calendar, calendarId } = client;
  const timeMin = zonedWallClockToUtc(args.planDate, 0, 0, args.timeZone).toISOString();
  const timeMax = planDateCleanupEndUtc(args.planDate, args.timeZone);
  const collected: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      showDeleted: true,
      privateExtendedProperty: [`source=${GOOGLE_SYNC_SOURCE}`],
      maxResults: 250,
      pageToken,
    });
    collected.push(...(res.data.items ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  const profile = await loadPlannerProfile(args.supabase, args.userId);
  const remoteFetched = collected.length;
  let remoteMatched = 0;
  let remoteApplied = 0;
  let remoteIgnored = 0;
  let conflicts = 0;

  if (process.env.NODE_ENV === "development") {
    console.info("[GoogleCalendarSync] remote events fetched", remoteFetched, args.planDate);
  }

  for (const ev of collected) {
    if (!isOurPlannerGoogleEvent(ev)) {
      remoteIgnored++;
      continue;
    }
    const evPlanDate =
      getPlannerDateFromGoogleEvent(ev) ??
      resolvePlannerDateFromGoogleEvent(ev, args.timeZone);
    if (evPlanDate && evPlanDate !== args.planDate) {
      remoteIgnored++;
      if (process.env.NODE_ENV === "development") {
        console.warn("[GoogleCalendarSync] ignored remote event", "wrong_plan_date", ev.id);
      }
      continue;
    }
    remoteMatched++;
    const result = await applySingleGoogleEvent({
      supabase: args.supabase,
      userId: args.userId,
      ev,
      blockMinutes: profile.blockMinutes,
      timeZone: args.timeZone,
    });
    if (result.applied) {
      remoteApplied++;
      if (process.env.NODE_ENV === "development") {
        console.info("[GoogleCalendarSync] applied remote update", {
          eventId: ev.id,
          plannerTaskId: getPlannerTaskIdFromGoogleEvent(ev),
        });
      }
    } else if (result.conflict) {
      conflicts++;
    } else {
      remoteIgnored++;
      if (process.env.NODE_ENV === "development" && result.reason) {
        console.warn("[GoogleCalendarSync] ignored remote event", result.reason, ev.id);
      }
    }
  }
  return { remoteFetched, remoteMatched, remoteApplied, remoteIgnored, conflicts };
}

export async function syncDailyPlanDateBidirectionally(args: {
  supabase: SupabaseClient;
  userId: string;
  planDate: string;
  direction?: "both" | "push" | "pull";
}): Promise<SyncResult & { syncedAt: string | null }> {
  const result: SyncResult = {
    localPushed: 0,
    remoteFetched: 0,
    remoteMatched: 0,
    remoteApplied: 0,
    remoteIgnored: 0,
    conflicts: 0,
    errors: [],
  };
  if (!isGoogleCalendarSyncGloballyEnabled()) {
    return { ...result, syncedAt: null };
  }
  const direction = args.direction ?? "both";
  const profile = await loadPlannerProfile(args.supabase, args.userId);

  try {
    if (direction === "both" || direction === "push") {
      await retryFailedCalendarSync({ supabase: args.supabase, userId: args.userId });
      const push = await pushPlannerPlanForDate({
        supabase: args.supabase,
        userId: args.userId,
        planDate: args.planDate,
      });
      result.localPushed = push.pushed;
      const client = await getGoogleCalendarClientForUser(args.supabase, args.userId);
      if (client && push.pushed > 0) {
        await cleanupLegacyPlanDateOnlyEvents({
          calendar: client.calendar,
          calendarId: client.calendarId,
          planDate: args.planDate,
          timeZone: profile.timeZone,
        });
      }
    }
    if (direction === "both" || direction === "pull") {
      const pull = await pullGoogleEventsForPlanDate({
        supabase: args.supabase,
        userId: args.userId,
        planDate: args.planDate,
        timeZone: profile.timeZone,
      });
      result.remoteFetched = pull.remoteFetched;
      result.remoteMatched = pull.remoteMatched;
      result.remoteApplied = pull.remoteApplied;
      result.remoteIgnored = pull.remoteIgnored;
      result.conflicts = pull.conflicts;
    }
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "sync_failed");
  }

  return { ...result, syncedAt: new Date().toISOString() };
}

export async function retryFailedCalendarSync(args: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<void> {
  const dates = await listPlanDatesWithPendingCalendarSync(args.supabase, args.userId);
  for (const d of dates) {
    await pushPlannerPlanForDate({ supabase: args.supabase, userId: args.userId, planDate: d });
  }
}

export async function resolvePlannerCalendarConflict(args: {
  supabase: SupabaseClient;
  userId: string;
  plannerTaskId: string;
  planDate: string;
  action: "local" | "google" | "unlink";
}): Promise<void> {
  const { supabase, userId, plannerTaskId, planDate, action } = args;
  if (action === "unlink") {
    await deleteTaskSyncRow(supabase, userId, plannerTaskId);
    return;
  }
  if (action === "local") {
    await supabase
      .from("calendar_task_sync")
      .update({
        sync_status: "local_pending",
        conflict_payload: null,
        sync_error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("planner_task_id", plannerTaskId);
    await pushPlannerPlanForDate({ supabase, userId, planDate });
    return;
  }
  const client = await getGoogleCalendarClientForUser(supabase, userId);
  if (!client) return;
  const { data: syncRow } = await supabase
    .from("calendar_task_sync")
    .select("google_event_id")
    .eq("user_id", userId)
    .eq("planner_task_id", plannerTaskId)
    .maybeSingle();
  const eventId = syncRow?.google_event_id as string | null;
  if (!eventId) return;
  const got = await client.calendar.events.get({
    calendarId: client.calendarId,
    eventId,
  });
  const profile = await loadPlannerProfile(supabase, userId);
  await applySingleGoogleEvent({
    supabase,
    userId,
    ev: got.data,
    blockMinutes: profile.blockMinutes,
    timeZone: profile.timeZone,
    skipConflict: true,
  });
}
