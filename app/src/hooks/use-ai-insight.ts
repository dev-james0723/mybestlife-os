"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";
import type { AIInsightKind } from "@/lib/habits/types";

/**
 * `useAIInsight` — cache-first hook for a single AI-generated insight.
 *
 * Each AI feature has a dedicated route handler under `app/api/ai/habits/*`
 * that encapsulates: auth → cache lookup → Gemini call → Zod validate →
 * cache write. This hook is a thin client against those handlers with a
 * stable cache key that includes the user's language so re-renders after a
 * locale change don't show stale translated prose.
 *
 * For streaming kinds (weekly_review, review_habit, quarterly_narrative) the
 * route handler returns a fully-assembled result in Phase 1 (stubbed) and
 * switches to SSE in Phase 3. The hook shape stays the same either way.
 */

type InsightEndpoint =
  | "build"
  | "compose-routine"
  | "goal-to-habits"
  | "weekly-review"
  | "struggle-detection"
  | "review-habit"
  | "correlation-insight"
  | "quarterly-narrative"
  | "secretary-brief"
  | "onboarding-recommend"
  | "cross-page-suggestions"
  | "timer-complete-reflection";

/**
 * The hook is bound to the habits AI surface (`/api/ai/habits/*`). Bio Lab
 * AI features have their own typed client fetchers in
 * `lib/ai/bio-lab/clients/*`, so they don't go through this hook.
 */
type HabitsAIInsightKind = Exclude<
  AIInsightKind,
  | "bio_lab_state_inference"
  | "bio_lab_mind_label"
  | "bio_lab_mind_triage"
  | "bio_lab_focus_recommendation"
  | "bio_lab_reset_sequence"
  | "bio_lab_weekly_insight"
  // Role Model Intelligence routes have their own typed client hook
  // (use-role-model-intelligence.ts) and don't go through this hook.
  | "role_model_analyze"
  | "role_model_patterns"
>;

const KIND_TO_ENDPOINT: Record<HabitsAIInsightKind, InsightEndpoint> = {
  habit_builder: "build",
  routine_composer: "compose-routine",
  goal_to_habits: "goal-to-habits",
  weekly_review: "weekly-review",
  struggle_detection: "struggle-detection",
  review_habit: "review-habit",
  correlation_insight: "correlation-insight",
  quarterly_narrative: "quarterly-narrative",
  secretary_brief: "secretary-brief",
  onboarding_recommend: "onboarding-recommend",
  cross_page_suggestions: "cross-page-suggestions",
  timer_complete_reflection: "timer-complete-reflection",
};

export type AIInsightPayload<TContent = unknown> = {
  kind: AIInsightKind;
  /** Free-form content. Structured kinds fill `content` as a typed object;
   *  streaming kinds fill `content.text`. */
  content: TContent;
  modelUsed: string | null;
  language: string;
  cached: boolean;
  /** ISO 8601 when this insight was generated (or last regenerated). */
  generatedAt: string;
};

type UseAIInsightOptions<TContent> = {
  /** When false, does not auto-fetch; caller must call `refresh()` manually. */
  enabled?: boolean;
  /** Extra TanStack Query options. */
  queryOptions?: Omit<
    UseQueryOptions<AIInsightPayload<TContent>>,
    "queryKey" | "queryFn" | "enabled"
  >;
};

export function useAIInsight<TContent = unknown>(
  kind: HabitsAIInsightKind,
  /**
   * Stable, serializable input shape. Must include everything that influences
   * the generation so the server-side hash invalidates cleanly when anything
   * meaningful changes (e.g. completion counts, target habit id, week start).
   */
  inputKey: Readonly<Record<string, unknown>>,
  opts: UseAIInsightOptions<TContent> = {},
) {
  const language = useAppStore((s) => s.language);
  const queryClient = useQueryClient();
  const endpoint = KIND_TO_ENDPOINT[kind];

  const query = useQuery<AIInsightPayload<TContent>>({
    queryKey: ["ai-insight", kind, language, inputKey],
    queryFn: async () => {
      const res = await fetch(`/api/ai/habits/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inputKey, language }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`ai_insight_${res.status}: ${body.slice(0, 300)}`);
      }
      return (await res.json()) as AIInsightPayload<TContent>;
    },
    enabled: opts.enabled ?? true,
    // AI insights are expensive; cache aggressively on the client too.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...opts.queryOptions,
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ai/habits/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inputKey, language, forceRefresh: true }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`ai_insight_refresh_${res.status}: ${body.slice(0, 300)}`);
      }
      return (await res.json()) as AIInsightPayload<TContent>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["ai-insight", kind, language, inputKey],
        data,
      );
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refresh: () => refresh.mutateAsync(),
    isRefreshing: refresh.isPending,
  };
}
