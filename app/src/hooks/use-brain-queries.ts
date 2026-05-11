/**
 * Life OS Brain — TanStack Query hooks for all 18 domain modules.
 *
 * Every `useQuery` here uses the authenticated Supabase client from each
 * domain's repository. RLS on every table enforces `auth.uid() = user_id`
 * so the per-user isolation guarantee never depends on app-level filtering.
 *
 * Query keys are intentionally namespaced (`["brain", "<domain>"]`) so the
 * Realtime sync hook (`use-brain-realtime-sync.ts`) can invalidate
 * individual slices without disturbing other features that may share the
 * same underlying repositories under different keys (e.g. `["quotes"]`).
 */

"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { aboutMeRepository } from "@/lib/repositories/about-me";
import { assetsRepository } from "@/lib/repositories/assets";
import { bucketItemsRepository } from "@/lib/repositories/bucket-list";
import { careerDecisionsRepository } from "@/lib/repositories/career-decisions";
import { careerEventsRepository } from "@/lib/repositories/career-events";
import { careerNetworkRepository } from "@/lib/repositories/career-network";
import { dailyPlansRepository } from "@/lib/repositories/daily-plans";
import { documentsRepository } from "@/lib/repositories/documents";
import { financeRepository } from "@/lib/repositories/finance";
import { goalsRepository } from "@/lib/repositories/goals";
import { gratefulThingsRepository } from "@/lib/repositories/grateful-things";
import { habitLinksRepository, habitsRepository } from "@/lib/repositories/habits";
import { healthGoalsRepository } from "@/lib/repositories/health-v2";
import { ideasRepository } from "@/lib/repositories/ideas";
import { journalRepository } from "@/lib/repositories/journal";
import { notesRepository } from "@/lib/repositories/notes";
import { projectsRepository } from "@/lib/repositories/projects";
import { quotesRepository } from "@/lib/repositories/quotes";
import { relationshipsRepository } from "@/lib/repositories/relationships";
import { roleModelsRepository } from "@/lib/repositories/role-models";
import { softwareVaultRepository } from "@/lib/repositories/software-vault";
import { tasksRepository } from "@/lib/repositories/tasks";

import { brainEdgesRepository } from "@/lib/brain/edges";
import { brainRelationsRepository } from "@/lib/brain/queries";
import { createClient } from "@/lib/supabase/client";
import {
  mapRowToCollection,
  mapRowToConnection,
  mapRowToItem,
} from "@/types/knowledge";
import type {
  KnowledgeConnection,
  KnowledgeItem,
  SmartCollection,
} from "@/types/knowledge";
import type { UserPromptRow } from "@/types/database";

const DEFAULT_STALE = 60_000;

/**
 * Shared resilience options for every Brain query.
 *
 * The Brain reads from 22 different tables. If any one of them errors out
 * (e.g. the table hasn't been migrated yet, the user has no rows, RLS
 * blocks them, or there's a transient network glitch), we don't want the
 * whole graph to disappear.
 *
 * Strategy:
 *   - Don't retry indefinitely; one retry is enough for transient failures.
 *   - Always return cached/empty data (`placeholderData: []`) so the
 *     consumer can never crash from `undefined`.
 *   - Force errors to NOT trip the global error boundary — we surface a
 *     gentle banner instead and keep rendering whatever loaded.
 */
const RESILIENT_QUERY_OPTS = {
  retry: 1,
  retryDelay: 800,
  // Throw to error boundaries? No — we want partial success to render.
  throwOnError: false,
} satisfies Pick<UseQueryOptions, "retry" | "retryDelay" | "throwOnError">;

/**
 * Postgres / PostgREST error codes that mean "this table doesn't exist
 * (yet)". Brain treats these as "no data" rather than a hard failure so
 * the graph still renders on a Supabase project that lags behind one or
 * two of the app's migrations — useful for local dev, fresh clones, and
 * partially-deployed environments.
 */
function isMissingTableLike(err: unknown): boolean {
  if (!err) return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  const msg = String(e.message ?? err).toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("not found in schema cache")
  );
}

/**
 * Wrap a query function so that "missing table" errors (PostgREST 205,
 * Postgres 42P01) resolve to an empty result instead of throwing. Other
 * errors still propagate so React Query can surface them in the banner.
 */
function safeList<T>(fn: () => Promise<T[]>): () => Promise<T[]> {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      if (isMissingTableLike(err)) {
        console.info(
          "[Brain] table not migrated yet, treating as empty:",
          (err as Error).message,
        );
        return [] as T[];
      }
      throw err;
    }
  };
}

/** Same as {@link safeList} but for queries that return a single row or null. */
function safeMaybe<T>(fn: () => Promise<T | null>): () => Promise<T | null> {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      if (isMissingTableLike(err)) {
        console.info(
          "[Brain] table not migrated yet, treating as empty:",
          (err as Error).message,
        );
        return null;
      }
      throw err;
    }
  };
}

/** Knowledge Base — items, smart collections, and AI connections. */
async function fetchKnowledgeBase(): Promise<{
  items: KnowledgeItem[];
  collections: SmartCollection[];
  connections: KnowledgeConnection[];
}> {
  const supabase = createClient();
  const [itemsRes, colsRes] = await Promise.all([
    supabase
      .from("knowledge_items")
      .select("*")
      .order("date_added", { ascending: false }),
    supabase
      .from("knowledge_smart_collections")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (colsRes.error) throw colsRes.error;

  const items = (itemsRes.data ?? []).map((r) =>
    mapRowToItem(r as Record<string, unknown>),
  );
  const collections = (colsRes.data ?? []).map((r) =>
    mapRowToCollection(r as Record<string, unknown>),
  );

  // Pull connections in chunked queries so very large knowledge bases
  // don't hit URL-length limits on the `in()` filter.
  const ids = items.map((i) => i.id);
  const chunkSize = 120;
  const connections = new Map<string, KnowledgeConnection>();
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const [a, b] = await Promise.all([
      supabase.from("knowledge_connections").select("*").in("source_item_id", chunk),
      supabase.from("knowledge_connections").select("*").in("target_item_id", chunk),
    ]);
    for (const row of [...(a.data ?? []), ...(b.data ?? [])]) {
      const conn = mapRowToConnection(row as Record<string, unknown>);
      connections.set(conn.id, conn);
    }
  }

  return { items, collections, connections: [...connections.values()] };
}

/** Personal AI prompt rows (snake_case DB shape) — used directly by the Brain adapter. */
async function fetchAiUserPromptRows(): Promise<UserPromptRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_user_prompts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserPromptRow[];
}

/**
 * Top-level hook returning every domain query the Brain needs. Each query
 * runs in parallel and is independently retryable / cacheable.
 */
export function useBrainQueries() {
  const knowledge = useQuery({
    queryKey: ["brain", "knowledge"] as const,
    // Knowledge fetcher returns a single object (not a list) — wrap with
    // a custom safe handler so missing-table errors degrade to empty.
    queryFn: async () => {
      try {
        return await fetchKnowledgeBase();
      } catch (err) {
        if (isMissingTableLike(err)) {
          console.info(
            "[Brain] knowledge tables not migrated, rendering empty knowledge slice.",
          );
          return { items: [], collections: [], connections: [] };
        }
        throw err;
      }
    },
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const goals = useQuery({
    queryKey: ["brain", "goals"] as const,
    queryFn: safeList(() => goalsRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const habits = useQuery({
    queryKey: ["brain", "habits"] as const,
    queryFn: safeList(() => habitsRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const habitLinks = useQuery({
    queryKey: ["brain", "habit_links"] as const,
    queryFn: safeList(() => habitLinksRepository.list()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const quotes = useQuery({
    queryKey: ["brain", "quotes"] as const,
    queryFn: safeList(() => quotesRepository.list()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const roleModels = useQuery({
    queryKey: ["brain", "role_models"] as const,
    queryFn: safeList(() => roleModelsRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const projects = useQuery({
    queryKey: ["brain", "projects"] as const,
    queryFn: safeList(() => projectsRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const tasks = useQuery({
    queryKey: ["brain", "tasks"] as const,
    queryFn: safeList(() => tasksRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const ideas = useQuery({
    queryKey: ["brain", "ideas"] as const,
    queryFn: safeList(() => ideasRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const journalEntries = useQuery({
    queryKey: ["brain", "journal"] as const,
    queryFn: safeList(() => journalRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const careerEvents = useQuery({
    queryKey: ["brain", "career_events"] as const,
    queryFn: safeList(() => careerEventsRepository.list()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const healthGoals = useQuery({
    queryKey: ["brain", "health_goals"] as const,
    queryFn: safeList(() => healthGoalsRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const financeGoals = useQuery({
    queryKey: ["brain", "finance_goals"] as const,
    queryFn: safeList(() => financeRepository.getSavingsGoals()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const bucketItems = useQuery({
    queryKey: ["brain", "bucket_items"] as const,
    queryFn: safeList(() => bucketItemsRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const relationships = useQuery({
    queryKey: ["brain", "relationships"] as const,
    queryFn: safeList(() => relationshipsRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const aboutMe = useQuery({
    queryKey: ["brain", "about_me"] as const,
    queryFn: safeMaybe(() => aboutMeRepository.get()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const gratefulThings = useQuery({
    queryKey: ["brain", "grateful_things"] as const,
    queryFn: safeList(() => gratefulThingsRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const assets = useQuery({
    queryKey: ["brain", "assets"] as const,
    queryFn: safeList(() => assetsRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const aiPrompts = useQuery({
    queryKey: ["brain", "ai_prompts"] as const,
    queryFn: safeList(fetchAiUserPromptRows),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const software = useQuery({
    queryKey: ["brain", "software"] as const,
    queryFn: safeList(() => softwareVaultRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const dailyPlans = useQuery({
    queryKey: ["brain", "daily_plans"] as const,
    queryFn: safeList(() => dailyPlansRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const brainRelations = useQuery({
    queryKey: ["brain", "relations"] as const,
    queryFn: safeList(() => brainRelationsRepository.list()),
    staleTime: 30_000,
    ...RESILIENT_QUERY_OPTS,
  });

  const brainEdges = useQuery({
    queryKey: ["brain", "edges"] as const,
    queryFn: safeList(() => brainEdgesRepository.list()),
    staleTime: 30_000,
    ...RESILIENT_QUERY_OPTS,
  });

  // ── New domain queries (Connected Brain Engine, phase 2) ────────────
  const documents = useQuery({
    queryKey: ["brain", "documents"] as const,
    queryFn: safeList(() => documentsRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const notes = useQuery({
    queryKey: ["brain", "notes"] as const,
    queryFn: safeList(() => notesRepository.getAll()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const careerDecisions = useQuery({
    queryKey: ["brain", "career_decisions"] as const,
    queryFn: safeList(() => careerDecisionsRepository.list()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const careerNetworkNodes = useQuery({
    queryKey: ["brain", "career_network_nodes"] as const,
    queryFn: safeList(() => careerNetworkRepository.listNodes()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const financeAccounts = useQuery({
    queryKey: ["brain", "finance_accounts"] as const,
    queryFn: safeList(() => financeRepository.getAccounts()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const financeCategories = useQuery({
    queryKey: ["brain", "finance_categories"] as const,
    queryFn: safeList(() => financeRepository.getCategories()),
    staleTime: DEFAULT_STALE,
    ...RESILIENT_QUERY_OPTS,
  });

  const queries = {
    knowledge,
    goals,
    habits,
    habitLinks,
    quotes,
    roleModels,
    projects,
    tasks,
    ideas,
    journalEntries,
    careerEvents,
    healthGoals,
    financeGoals,
    bucketItems,
    relationships,
    aboutMe,
    gratefulThings,
    assets,
    aiPrompts,
    software,
    dailyPlans,
    brainRelations,
    brainEdges,
    documents,
    notes,
    careerDecisions,
    careerNetworkNodes,
    financeAccounts,
    financeCategories,
  };

  const allQueries = Object.values(queries);
  // "Initial loading" — every query is still in its first fetch. We use
  // this to show the spinner ONCE, on first paint, never afterwards.
  const isInitialLoading = allQueries.every((q) => q.isLoading);
  // Any individual query that failed (table missing, RLS blocked, etc.).
  // We never use this to hide the canvas — only to show a soft warning.
  const failedCount = allQueries.filter((q) => q.isError).length;
  const errors = allQueries
    .map((q) => q.error)
    .filter((e): e is Error => e instanceof Error);

  return {
    queries,
    /** True only on first paint while every query is still pending. */
    isInitialLoading,
    /** Number of individual data slices that failed to load. */
    failedCount,
    /** All Error instances from failed queries (for diagnostics). */
    errors,
  };
}

export type BrainQueries = ReturnType<typeof useBrainQueries>["queries"];
