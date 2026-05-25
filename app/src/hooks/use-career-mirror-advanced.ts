"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CareerScenario,
  CareerWeeklyReview,
  CareerPromptPack,
} from "@/types/database";
import type {
  ScenarioResult,
  RealityCheckResult,
  WeeklyReviewResult,
  AssetAuditResult,
  OpportunitiesResult,
} from "@/lib/career-mirror/validators";

/**
 * use-career-mirror-advanced — data layer for the advanced AI Career Mirror
 * panels (scenario simulator, weekly review, prompt packs, asset audit,
 * reality check, opportunities).
 *
 * Every async wrapper resolves with a discriminated `{ ok: true, ... }` /
 * `{ ok: false, error }` result and NEVER throws into the caller, so panels can
 * always render a loading / error / success state instead of crashing. GET
 * lists are exposed as React Query hooks; mutations invalidate the relevant
 * query keys on success.
 */

const SCENARIOS_KEY = ["career-scenarios"] as const;
const WEEKLY_REVIEW_KEY = ["career-weekly-review"] as const;
const PROMPT_PACKS_KEY = ["career-prompt-packs"] as const;

const DEFAULT_ERROR = "request_failed";

export type AdvancedResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/** GET helper — converts network / `{ok:false}` errors into a result. */
async function getJson<T>(url: string): Promise<AdvancedResult<T>> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    let json: Record<string, unknown> | null = null;
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      json = null;
    }
    if (!res.ok || !json || json.ok !== true) {
      const error =
        (json && typeof json.error === "string" && json.error) ||
        `http_${res.status}`;
      return { ok: false, error };
    }
    return json as unknown as AdvancedResult<T>;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : DEFAULT_ERROR };
  }
}

/** POST helper — converts network / `{ok:false}` errors into a result. */
async function postJson<T>(
  url: string,
  body?: unknown,
): Promise<AdvancedResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    let json: Record<string, unknown> | null = null;
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      json = null;
    }
    if (!res.ok || !json || json.ok !== true) {
      const error =
        (json && typeof json.error === "string" && json.error) ||
        `http_${res.status}`;
      return { ok: false, error };
    }
    return json as unknown as AdvancedResult<T>;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : DEFAULT_ERROR };
  }
}

/** DELETE helper — converts network / `{ok:false}` errors into a result. */
async function deleteJson(url: string): Promise<AdvancedResult<unknown>> {
  try {
    const res = await fetch(url, { method: "DELETE" });
    let json: Record<string, unknown> | null = null;
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      json = null;
    }
    if (!res.ok || !json || json.ok !== true) {
      const error =
        (json && typeof json.error === "string" && json.error) ||
        `http_${res.status}`;
      return { ok: false, error };
    }
    return json as unknown as AdvancedResult<unknown>;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : DEFAULT_ERROR };
  }
}

// Loose result shapes — the API stores results as JSON blobs, so we treat each
// payload as a partial of the validated shape (fields may be absent on legacy
// rows or AI failures, hence Partial).
export type ScenarioResultData = Partial<ScenarioResult>;
export type RealityCheckResultData = Partial<RealityCheckResult>;
export type WeeklyReviewResultData = Partial<WeeklyReviewResult>;
export type AssetAuditResultData = Partial<AssetAuditResult>;
export type OpportunitiesResultData = Partial<OpportunitiesResult>;

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

/** List the user's saved scenarios (newest first). */
export function useCareerScenarios() {
  return useQuery<CareerScenario[]>({
    queryKey: SCENARIOS_KEY,
    queryFn: async () => {
      const result = await getJson<{ scenarios: CareerScenario[] }>(
        "/api/career/scenarios",
      );
      if (!result.ok) throw new Error(result.error);
      return result.scenarios ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Weekly review (GET latest)
// ---------------------------------------------------------------------------

/** Latest weekly review (or null when none generated yet). */
export function useCareerWeeklyReview() {
  return useQuery<CareerWeeklyReview | null>({
    queryKey: WEEKLY_REVIEW_KEY,
    queryFn: async () => {
      const result = await getJson<{ review: CareerWeeklyReview | null }>(
        "/api/career/weekly-review",
      );
      if (!result.ok) throw new Error(result.error);
      return result.review ?? null;
    },
  });
}

// ---------------------------------------------------------------------------
// Prompt packs (GET list)
// ---------------------------------------------------------------------------

/** List the user's generated prompt packs. */
export function useCareerPromptPacks() {
  return useQuery<CareerPromptPack[]>({
    queryKey: PROMPT_PACKS_KEY,
    queryFn: async () => {
      const result = await getJson<{ packs: CareerPromptPack[] }>(
        "/api/career/prompt-packs",
      );
      if (!result.ok) throw new Error(result.error);
      return result.packs ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations (never-throwing wrappers + query invalidation)
// ---------------------------------------------------------------------------

export type UseCareerMirrorAdvanced = {
  /** Create + simulate a scenario, then refresh the saved-scenario list. */
  createScenario: (input: {
    title: string;
    inputs: Record<string, unknown>;
  }) => Promise<AdvancedResult<{ scenario: CareerScenario }>>;
  /** Delete a saved scenario, then refresh the list. */
  deleteScenario: (id: string) => Promise<AdvancedResult<unknown>>;
  /** Generate (or regenerate) this week's review, then refresh it. */
  generateWeeklyReview: (
    weekStart?: string,
  ) => Promise<AdvancedResult<{ review: CareerWeeklyReview }>>;
  /** Run an asset-gap audit (does not persist to a list query). */
  runAssetAudit: () => Promise<AdvancedResult<{ audit: AssetAuditResultData }>>;
  /** Generate a personal prompt pack, then refresh the list. */
  generatePromptPack: (
    title?: string,
  ) => Promise<AdvancedResult<{ pack: CareerPromptPack }>>;
  /** Match opportunities for the current profile. */
  matchOpportunities: () => Promise<
    AdvancedResult<{ opportunities: OpportunitiesResultData["opportunities"] }>
  >;
  /** Reality-check a stated target against the current profile. */
  realityCheck: (
    target: string,
  ) => Promise<AdvancedResult<{ result: RealityCheckResultData }>>;
};

/**
 * Mutation wrappers for the advanced panels. Returned functions are stable and
 * invalidate the matching query key on success.
 */
export function useCareerMirrorAdvanced(): UseCareerMirrorAdvanced {
  const qc = useQueryClient();

  const createScenario = React.useCallback(
    async (input: { title: string; inputs: Record<string, unknown> }) => {
      const result = await postJson<{ scenario: CareerScenario }>(
        "/api/career/scenarios",
        input,
      );
      if (result.ok) void qc.invalidateQueries({ queryKey: SCENARIOS_KEY });
      return result;
    },
    [qc],
  );

  const deleteScenario = React.useCallback(
    async (id: string) => {
      const result = await deleteJson(
        `/api/career/scenarios/${encodeURIComponent(id)}`,
      );
      if (result.ok) {
        qc.setQueryData<CareerScenario[] | undefined>(SCENARIOS_KEY, (prev) =>
          prev ? prev.filter((s) => s.id !== id) : prev,
        );
        void qc.invalidateQueries({ queryKey: SCENARIOS_KEY });
      }
      return result;
    },
    [qc],
  );

  const generateWeeklyReview = React.useCallback(
    async (weekStart?: string) => {
      const result = await postJson<{ review: CareerWeeklyReview }>(
        "/api/career/weekly-review",
        weekStart ? { week_start: weekStart } : {},
      );
      if (result.ok) {
        qc.setQueryData(WEEKLY_REVIEW_KEY, result.review);
        void qc.invalidateQueries({ queryKey: WEEKLY_REVIEW_KEY });
      }
      return result;
    },
    [qc],
  );

  const runAssetAudit = React.useCallback(
    async () =>
      postJson<{ audit: AssetAuditResultData }>("/api/career/asset-audit", {}),
    [],
  );

  const generatePromptPack = React.useCallback(
    async (title?: string) => {
      const result = await postJson<{ pack: CareerPromptPack }>(
        "/api/career/prompt-packs",
        title ? { title } : {},
      );
      if (result.ok) void qc.invalidateQueries({ queryKey: PROMPT_PACKS_KEY });
      return result;
    },
    [qc],
  );

  const matchOpportunities = React.useCallback(
    async () =>
      postJson<{ opportunities: OpportunitiesResultData["opportunities"] }>(
        "/api/career/opportunities",
        {},
      ),
    [],
  );

  const realityCheck = React.useCallback(
    async (target: string) =>
      postJson<{ result: RealityCheckResultData }>(
        "/api/career/mirror/reality-check",
        { target },
      ),
    [],
  );

  return {
    createScenario,
    deleteScenario,
    generateWeeklyReview,
    runAssetAudit,
    generatePromptPack,
    matchOpportunities,
    realityCheck,
  };
}

export default useCareerMirrorAdvanced;
