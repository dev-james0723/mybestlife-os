import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(() => Promise.resolve()),
  requestPlannerGoogleCalendarPush: vi.fn(() =>
    Promise.resolve({ syncedAt: "2026-09-03T12:00:00.000Z" }),
  ),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: unknown) => options,
  useQuery: vi.fn(),
  useQueryClient: () => ({
    setQueryData: mocks.setQueryData,
    invalidateQueries: mocks.invalidateQueries,
  }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/repositories/daily-plans", () => ({
  dailyPlansRepository: {
    getAll: vi.fn(),
    getRange: vi.fn(),
    getByDate: vi.fn(),
    upsertByDate: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock("@/lib/calendar/query-keys", () => ({
  CALENDAR_QUERY_KEY: ["calendar-events"],
}));
vi.mock("@/stores/app-store", () => ({
  useAppStore: { getState: () => ({ language: "en" }) },
}));
vi.mock("@/lib/i18n/daily-planner-ui", () => ({
  getDailyPlannerUiCopy: () => ({ toastDailyPlanSaveFailed: "Save failed" }),
}));
vi.mock("@/lib/google/planner-calendar-push-request", () => ({
  requestPlannerGoogleCalendarPush: mocks.requestPlannerGoogleCalendarPush,
}));

import { useUpsertDailyPlan } from "./use-daily-plans";

type CapturedMutation = {
  onSuccess: (data: unknown, input: { plan_date: string }) => unknown;
};

describe("useUpsertDailyPlan reorder follow-up", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.setQueryData.mockReset();
    mocks.invalidateQueries.mockReset();
    mocks.invalidateQueries.mockResolvedValue(undefined);
    mocks.requestPlannerGoogleCalendarPush.mockReset();
    mocks.requestPlannerGoogleCalendarPush.mockResolvedValue({
      syncedAt: "2026-09-03T12:00:00.000Z",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes the saved plan immediately and coalesces calendar work off the mutation path", async () => {
    const mutation = useUpsertDailyPlan() as unknown as CapturedMutation;
    const savedPlan = { plan_date: "2026-09-03", tasks: [{ plannerTaskId: "b" }] };

    const firstResult = mutation.onSuccess(savedPlan, { plan_date: "2026-09-03" });

    expect(firstResult).toBeUndefined();
    expect(mocks.setQueryData).toHaveBeenCalledWith(
      ["daily-plans", "2026-09-03"],
      savedPlan,
    );
    expect(mocks.requestPlannerGoogleCalendarPush).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    mutation.onSuccess(
      { plan_date: "2026-09-03", tasks: [{ plannerTaskId: "a" }] },
      { plan_date: "2026-09-03" },
    );
    await vi.advanceTimersByTimeAsync(249);
    expect(mocks.requestPlannerGoogleCalendarPush).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.requestPlannerGoogleCalendarPush).toHaveBeenCalledTimes(1);
    expect(mocks.requestPlannerGoogleCalendarPush).toHaveBeenCalledWith("2026-09-03");
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["daily-plans"],
    });
  });

  it("keeps same-day calendar pushes single-flight and runs one trailing refresh", async () => {
    let finishFirstPush: ((value: { syncedAt: string }) => void) | undefined;
    mocks.requestPlannerGoogleCalendarPush
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirstPush = resolve;
          }),
      )
      .mockResolvedValue({ syncedAt: "2026-09-03T12:01:00.000Z" });

    const mutation = useUpsertDailyPlan() as unknown as CapturedMutation;
    mutation.onSuccess({ plan_date: "2026-09-03" }, { plan_date: "2026-09-03" });
    await vi.advanceTimersByTimeAsync(250);
    expect(mocks.requestPlannerGoogleCalendarPush).toHaveBeenCalledTimes(1);

    mutation.onSuccess({ plan_date: "2026-09-03" }, { plan_date: "2026-09-03" });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(mocks.requestPlannerGoogleCalendarPush).toHaveBeenCalledTimes(1);

    finishFirstPush?.({ syncedAt: "2026-09-03T12:00:00.000Z" });
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.requestPlannerGoogleCalendarPush).toHaveBeenCalledTimes(2);
  });
});
