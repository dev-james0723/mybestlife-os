"use client";

import { useMutation } from "@tanstack/react-query";
import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import type {
  ClearOpenLoopsRequest,
  ClearOpenLoopsResponse,
  EnergyLevel,
  LifeBriefResponse,
  OpenLoopsResponse,
  PlanMyDayResponse,
  WeeklyReviewResponse,
} from "@/lib/life-agent/workflow-types";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";

type WorkflowBody = {
  displayName?: string;
  locale?: string;
  temporaryPermissions?: Partial<Record<LifeAgentPermissionDomain, boolean>>;
};

type OpenLoopsApiResult =
  | { kind: "analyze"; data: OpenLoopsResponse }
  | { kind: "clear"; data: ClearOpenLoopsResponse };

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/life-agent/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = (await res.json()) as T & { error?: string; detail?: string };
  if (!res.ok) {
    throw new Error(json.detail ?? json.error ?? "workflow_failed");
  }
  return json;
}

export function useDailyBrief() {
  return useMutation({
    mutationFn: (input?: WorkflowBody) =>
      postJson<LifeBriefResponse>("daily-brief", input),
  });
}

export function useOpenLoopsAnalyze() {
  return useMutation({
    mutationFn: async (input?: WorkflowBody) => {
      const r = await postJson<OpenLoopsApiResult>("open-loops", { ...input, mode: "analyze" });
      if (r.kind !== "analyze") throw new Error("unexpected_open_loops_response");
      return r.data;
    },
  });
}

export function useClearOpenLoops() {
  return useMutation({
    mutationFn: async (input: ClearOpenLoopsRequest & WorkflowBody) => {
      const r = await postJson<OpenLoopsApiResult>("open-loops", { ...input, mode: "clear" });
      if (r.kind !== "clear") throw new Error("unexpected_clear_loops_response");
      return r.data;
    },
  });
}

export function usePlanMyDay() {
  return useMutation({
    mutationFn: (input: WorkflowBody & { energyLevel: EnergyLevel }) =>
      postJson<PlanMyDayResponse>("plan-day", input),
  });
}

export function useWeeklyReview() {
  return useMutation({
    mutationFn: (input?: WorkflowBody) =>
      postJson<WeeklyReviewResponse>("weekly-review", input),
  });
}

export function mergeActionPreviews(
  existing: LifeAgentActionPreviewCard[],
  incoming: LifeAgentActionPreviewCard[],
): LifeAgentActionPreviewCard[] {
  const byId = new Map(existing.map((p) => [p.id, p]));
  for (const p of incoming) {
    byId.set(p.id, p);
  }
  return [...byId.values()];
}
