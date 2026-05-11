/**
 * Life OS Brain — Supabase Realtime sync.
 *
 * Subscribes to `postgres_changes` on every table the Brain reads from and,
 * on any INSERT / UPDATE / DELETE, calls `queryClient.invalidateQueries`
 * for the matching `["brain", <domain>]` key. TanStack Query then refetches
 * in the background so the canvas updates within seconds without polling.
 *
 * Multi-user safety: Supabase Realtime respects RLS. Each user's
 * subscription only receives events for rows where `auth.uid() = user_id`,
 * so cross-user events never leak into another user's channel.
 *
 * NOTE: For the per-table push to work the table must be added to the
 * `supabase_realtime` publication. The `brain_relations` migration handles
 * that for our new table; existing tables (goals, habits, …) have to be
 * published separately. If a table is not yet published, this hook still
 * functions — there will simply be no live event for that table, and
 * TanStack Query's window-focus refetch + 60s `staleTime` keeps the graph
 * approximately fresh.
 */

"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

/**
 * Map of Postgres table name → query key segment that should be invalidated
 * when that table changes. Only tables the Brain actually reads from are
 * listed; adding more tables here is the only step required to subscribe
 * to additional sources of truth in the future.
 */
const TABLE_TO_QUERY_KEY: Record<string, string> = {
  // Knowledge
  knowledge_items: "knowledge",
  knowledge_smart_collections: "knowledge",
  knowledge_connections: "knowledge",
  // Domain modules
  goals: "goals",
  habits: "habits",
  habit_links: "habit_links",
  quotes: "quotes",
  role_models: "role_models",
  projects: "projects",
  tasks: "tasks",
  ideas: "ideas",
  journal_entries: "journal",
  career_events: "career_events",
  health_goals: "health_goals",
  finance_savings_goals: "finance_goals",
  bucket_items: "bucket_items",
  relationships: "relationships",
  about_me: "about_me",
  grateful_things: "grateful_things",
  assets: "assets",
  ai_user_prompts: "ai_prompts",
  software_vault: "software",
  daily_plans: "daily_plans",
  brain_relations: "relations",
  // Phase 2 additions — new normalized domains.
  documents: "documents",
  notes: "notes",
  career_decisions: "career_decisions",
  career_network_nodes: "career_network_nodes",
  finance_accounts: "finance_accounts",
  finance_categories: "finance_categories",
  brain_edges: "edges",
};

export function useBrainRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("brain-realtime");

    for (const [table, key] of Object.entries(TABLE_TO_QUERY_KEY)) {
      channel.on(
        // The Realtime extension types the second arg loosely; cast to keep
        // strict TS happy without a full module re-augmentation.
        "postgres_changes" as never,
        { event: "*", schema: "public", table },
        () => {
          queryClient.invalidateQueries({ queryKey: ["brain", key] });
        },
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
