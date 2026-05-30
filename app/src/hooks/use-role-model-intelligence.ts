"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import type {
  RoleModelInsightContextPayload,
  RoleModelInsightResult,
  RoleModelPatternResult,
} from "@/types/role-model-intelligence";

type InsightResponse = {
  result: RoleModelInsightResult | null;
  cached: boolean;
  meta: { modelUsed: string | null; generatedAt: string } | null;
};

type PatternResponse = {
  result: RoleModelPatternResult | null;
  cached: boolean;
  meta: { modelUsed: string | null; generatedAt: string } | null;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "request_failed");
  return json;
}

// ---------------------------------------------------------------------------
// Per-role-model insight
// ---------------------------------------------------------------------------

export function useRoleModelInsight(roleModelId: string | null | undefined) {
  const locale = parseAppLocale(useAppStore((s) => s.language));
  const qc = useQueryClient();
  const key = ["role-model-insight", roleModelId ?? "none", locale] as const;

  const peek = useQuery({
    queryKey: key,
    enabled: Boolean(roleModelId),
    staleTime: 5 * 60_000,
    queryFn: () =>
      postJson<InsightResponse>("/api/ai/role-model/analyze", {
        roleModelId,
        mode: "peek",
        language: locale,
      }),
  });

  const generate = useMutation({
    mutationFn: (args: { context: RoleModelInsightContextPayload; forceRefresh?: boolean }) =>
      postJson<InsightResponse>("/api/ai/role-model/analyze", {
        roleModelId,
        mode: "generate",
        forceRefresh: args.forceRefresh ?? false,
        language: locale,
        context: args.context,
      }),
    onSuccess: (data) => {
      qc.setQueryData(key, data);
    },
  });

  return {
    insight: peek.data?.result ?? null,
    meta: peek.data?.meta ?? generate.data?.meta ?? null,
    isPeeking: peek.isLoading,
    generate,
  };
}

// ---------------------------------------------------------------------------
// Collection-level pattern report
// ---------------------------------------------------------------------------

export type PatternRosterEntry = {
  id: string;
  name: string;
  category?: string | null;
  blurb?: string | null;
};

export function useRoleModelPatterns(
  roster: PatternRosterEntry[],
  aboutMe?: { mission?: string | null; coreValues?: string | null; personality?: string | null } | null,
) {
  const locale = parseAppLocale(useAppStore((s) => s.language));
  const qc = useQueryClient();
  const signature = roster.map((r) => r.id).sort().join(",");
  const key = ["role-model-patterns", signature, locale] as const;

  const peek = useQuery({
    queryKey: key,
    enabled: roster.length >= 2,
    staleTime: 10 * 60_000,
    queryFn: () =>
      postJson<PatternResponse>("/api/ai/role-model/patterns", {
        mode: "peek",
        language: locale,
        roleModels: roster,
      }),
  });

  const generate = useMutation({
    mutationFn: (args?: { forceRefresh?: boolean }) =>
      postJson<PatternResponse>("/api/ai/role-model/patterns", {
        mode: "generate",
        forceRefresh: args?.forceRefresh ?? false,
        language: locale,
        roleModels: roster,
        aboutMe: aboutMe ?? null,
      }),
    onSuccess: (data) => {
      qc.setQueryData(key, data);
    },
  });

  return {
    report: peek.data?.result ?? null,
    meta: peek.data?.meta ?? generate.data?.meta ?? null,
    isPeeking: peek.isLoading,
    generate,
  };
}
