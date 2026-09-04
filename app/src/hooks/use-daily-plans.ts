"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  dailyPlansRepository,
  type CreateDailyPlanInput,
  type UpdateDailyPlanInput,
} from "@/lib/repositories/daily-plans";
import { CALENDAR_QUERY_KEY } from "@/lib/calendar/query-keys";
import { useAppStore } from "@/stores/app-store";
import { getDailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import { requestPlannerGoogleCalendarPush } from "@/lib/google/planner-calendar-push-request";

const PLANNER_CALENDAR_PUSH_DEBOUNCE_MS = 250;
type PlannerCalendarPushState = {
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
  dirty: boolean;
};

const plannerCalendarPushStates = new WeakMap<
  QueryClient,
  Map<string, PlannerCalendarPushState>
>();

async function runPlannerCalendarRefresh(
  queryClient: QueryClient,
  planDate: string,
  states: Map<string, PlannerCalendarPushState>,
  state: PlannerCalendarPushState,
) {
  if (state.inFlight) {
    state.dirty = true;
    return;
  }

  state.inFlight = true;
  state.dirty = false;
  try {
    await requestPlannerGoogleCalendarPush(planDate);
    await Promise.all([
      // The push endpoint also pulls remote calendar edits. Refresh every
      // daily-plan shape so list/range/date consumers converge together.
      queryClient.invalidateQueries({ queryKey: ["daily-plans"] }),
      queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY }),
      queryClient.invalidateQueries({
        queryKey: ["google-calendar-planner-status"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["google-calendar-task-sync", planDate],
      }),
    ]);
  } catch {
    // Planner persistence already succeeded; a background calendar refresh
    // must never turn a completed reorder into an unhandled client error.
  } finally {
    state.inFlight = false;
    if (state.dirty) {
      // At least one save landed while this request was in flight. Run one
      // trailing refresh with the newest persisted plan, never concurrently.
      state.dirty = false;
      state.timer = setTimeout(() => {
        state.timer = null;
        void runPlannerCalendarRefresh(queryClient, planDate, states, state);
      }, 0);
    } else if (state.timer === null) {
      states.delete(planDate);
    }
  }
}

/**
 * Calendar mirroring is follow-up work, not part of the planner write's
 * critical path. Coalesce rapid same-day edits and release the mutation scope
 * immediately so drag/drop cannot wait behind a network sync.
 */
function schedulePlannerCalendarRefresh(
  queryClient: QueryClient,
  planDate: string,
) {
  let states = plannerCalendarPushStates.get(queryClient);
  if (!states) {
    states = new Map();
    plannerCalendarPushStates.set(queryClient, states);
  }

  let state = states.get(planDate);
  if (!state) {
    state = { timer: null, inFlight: false, dirty: false };
    states.set(planDate, state);
  }

  if (state.inFlight) {
    state.dirty = true;
    return;
  }

  if (state.timer) clearTimeout(state.timer);

  const activeState = state;
  state.timer = setTimeout(() => {
    activeState.timer = null;
    void runPlannerCalendarRefresh(queryClient, planDate, states, activeState);
  }, PLANNER_CALENDAR_PUSH_DEBOUNCE_MS);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Something went wrong";
  }
}

export function useDailyPlans() {
  return useQuery({
    queryKey: ["daily-plans"],
    queryFn: dailyPlansRepository.getAll,
  });
}

export function useDailyPlansInRange(from: string, to: string) {
  return useQuery({
    queryKey: ["daily-plans", "range", from, to],
    queryFn: () => dailyPlansRepository.getRange(from, to),
    enabled: !!from && !!to,
  });
}

export function useDailyPlan(planDate: string) {
  return useQuery({
    queryKey: ["daily-plans", planDate],
    queryFn: () => dailyPlansRepository.getByDate(planDate),
    enabled: !!planDate,
  });
}

export function useUpsertDailyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDailyPlanInput) => dailyPlansRepository.upsertByDate(input),
    // Same-day edits can overlap (for example a fast reorder followed by a
    // block change). Serial execution prevents an older response arriving last
    // and restoring an obsolete task order.
    scope: { id: "daily-plan-write" },
    onSuccess: (data, input) => {
      // The mutation response is authoritative. Publish it synchronously so a
      // save never waits on a refetch before the UI/cache agree on row order.
      queryClient.setQueryData(["daily-plans", input.plan_date], data);
      void queryClient.invalidateQueries({
        queryKey: ["daily-plans"],
        exact: true,
      });
      void queryClient.invalidateQueries({ queryKey: ["daily-plans", "range"] });
      void queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["google-calendar-planner-status"] });
      void queryClient.invalidateQueries({
        queryKey: ["google-calendar-task-sync", input.plan_date],
      });
      schedulePlannerCalendarRefresh(queryClient, input.plan_date);
    },
    onError: (err) => {
      const ui = getDailyPlannerUiCopy(useAppStore.getState().language);
      toast.error(`${ui.toastDailyPlanSaveFailed}: ${errorMessage(err)}`);
    },
  });
}

export function useUpdateDailyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDailyPlanInput }) =>
      dailyPlansRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-plans"] });
      queryClient.invalidateQueries({ queryKey: ["daily-plans", "range"] });
      queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
    },
    onError: (err) => {
      const ui = getDailyPlannerUiCopy(useAppStore.getState().language);
      toast.error(`${ui.toastDailyPlanUpdateFailed}: ${errorMessage(err)}`);
    },
  });
}
