/**
 * Bucket List — cross-module SDK.
 *
 * Contract exposed for Dashboard, MindClear, Journal, and Goals to embed
 * bucket list signals without coupling to the page's internal components.
 * Each helper is server-safe (uses the server Supabase client) so it can
 * be called from App Router server components / route handlers / edge.
 *
 * These helpers **read** bucket state and project light-weight projections;
 * writes go through the client repository (`bucketItemsRepository`) from a
 * user session.
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  BucketHighlights,
  BucketItem,
  BucketStats,
} from "@/types/bucket-list";

// ─── Basic fetch helpers ──────────────────────────────────────────────────────

async function getItemsForCurrentUser(): Promise<BucketItem[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return [];

  const { data, error } = await supabase
    .from("bucket_items")
    .select("*")
    .eq("user_id", user.id)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as BucketItem[];
}

// ─── Summaries ────────────────────────────────────────────────────────────────

export async function getBucketStats(): Promise<BucketStats> {
  const list = await getItemsForCurrentUser();
  return {
    total: list.length,
    completed: list.filter((b) => b.status === "completed").length,
    active: list.filter(
      (b) =>
        b.status === "active" ||
        b.status === "planning" ||
        b.status === "exploring",
    ).length,
    funded: list.filter(
      (b) =>
        b.status === "funded" ||
        b.status === "scheduled" ||
        b.status === "booked",
    ).length,
    dreaming: list.filter((b) => b.status === "dreaming").length,
  };
}

export async function getBucketHighlights(): Promise<BucketHighlights> {
  const list = await getItemsForCurrentUser();
  return computeHighlights(list);
}

export async function getDashboardBucketSummary(): Promise<{
  stats: BucketStats;
  highlights: BucketHighlights;
  closestTravelDream: BucketItem | null;
}> {
  const list = await getItemsForCurrentUser();
  const highlights = computeHighlights(list);
  const stats: BucketStats = {
    total: list.length,
    completed: list.filter((b) => b.status === "completed").length,
    active: list.filter(
      (b) =>
        b.status === "active" ||
        b.status === "planning" ||
        b.status === "exploring",
    ).length,
    funded: list.filter(
      (b) =>
        b.status === "funded" ||
        b.status === "scheduled" ||
        b.status === "booked",
    ).length,
    dreaming: list.filter((b) => b.status === "dreaming").length,
  };
  const closestTravelDream = list
    .filter((b) => b.type === "travel" && b.status !== "completed")
    .sort((a, b) => (a.target_date ?? "9").localeCompare(b.target_date ?? "9"))[0] ??
    null;

  return { stats, highlights, closestTravelDream };
}

// ─── Linkage lookups (used by Goals / Finance / Projects embedding) ──────────

/** Given a Project id, find the bucket item it was activated from (if any). */
export async function getBucketItemForProject(
  projectId: string,
): Promise<BucketItem | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("bucket_items")
    .select("*")
    .eq("linked_project_id", projectId)
    .maybeSingle();
  if (error) return null;
  return (data ?? null) as BucketItem | null;
}

/** Given a Savings Goal id, find the bucket item it funds (if any). */
export async function getBucketItemForSavingsGoal(
  savingsGoalId: string,
): Promise<BucketItem | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("bucket_items")
    .select("*")
    .eq("linked_savings_goal_id", savingsGoalId)
    .maybeSingle();
  if (error) return null;
  return (data ?? null) as BucketItem | null;
}

/** Returns bucket items whose recent travel deal beats the exploratory max. */
export async function getTravelDealsForDashboard(): Promise<BucketItem[]> {
  const list = await getItemsForCurrentUser();
  return list.filter(
    (b) =>
      b.type === "travel" &&
      b.flight_watch_enabled &&
      b.latest_live_price != null &&
      b.exploratory_price_max != null &&
      b.latest_live_price <= b.exploratory_price_max * 0.9,
  );
}

// ─── Pure helpers shared with the client ──────────────────────────────────────

export function computeHighlights(list: BucketItem[]): BucketHighlights {
  const active = list.filter((b) => b.status !== "archived");
  const notDone = active.filter((b) => b.status !== "completed");

  const withTarget = notDone
    .map((b) => {
      const iso = b.target_date
        ? b.target_date
        : b.target_month
          ? `${b.target_month}-01`
          : null;
      return { item: b, due: iso ? new Date(iso).getTime() : null };
    })
    .filter((x) => x.due !== null && x.due! > Date.now())
    .sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
  const closestToReality = withTarget[0]?.item ?? null;

  const pushCandidates = notDone.filter(
    (b) =>
      b.is_featured ||
      b.priority === "high" ||
      b.status === "active" ||
      b.status === "planning",
  );
  const pushThisWeek =
    pushCandidates.find((b) => b.id !== closestToReality?.id) ??
    pushCandidates[0] ??
    null;

  const latestCompletion =
    list
      .filter((b) => b.status === "completed" && b.completed_at)
      .sort((a, b) =>
        (b.completed_at ?? "").localeCompare(a.completed_at ?? ""),
      )[0] ?? null;

  const travelDeal =
    active
      .filter(
        (b) =>
          b.type === "travel" &&
          b.flight_watch_enabled &&
          b.latest_live_price != null,
      )
      .sort((a, b) => (a.latest_live_price ?? 0) - (b.latest_live_price ?? 0))[0] ??
    null;

  return { closestToReality, pushThisWeek, latestCompletion, travelDeal };
}
