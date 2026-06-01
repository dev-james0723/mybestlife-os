/**
 * Deterministic, non-judgmental Dream Readiness score.
 *
 * Pure + dependency-free so it runs identically on the client (instant display
 * in the Intelligence Hub) and on the server (so the persisted AI report's
 * readiness score matches what the user sees). It never calls AI.
 */

import type { BucketItem } from "@/types/bucket-list";

export type ReadinessCategory = "emotional" | "logistics" | "travel";

export type ReadinessFactor = {
  key: string;
  category: ReadinessCategory;
  met: boolean;
  weight: number;
};

export type DreamReadinessContext = {
  /** Number of gallery images (uploaded / generated). */
  imageCount?: number;
  /** Whether a cached AI intelligence report exists (proxy for "has a next step"). */
  hasReport?: boolean;
};

export type DreamReadiness = {
  score: number; // 0–100
  emotionalScore: number; // 0–100
  logisticsScore: number; // 0–100 (includes travel factors for travel dreams)
  factors: ReadinessFactor[];
};

function pct(met: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((met / total) * 100);
}

/** Compute the readiness factors + weighted score for a dream. */
export function computeDreamReadiness(
  item: BucketItem,
  ctx: DreamReadinessContext = {},
): DreamReadiness {
  const hasImage =
    (ctx.imageCount ?? 0) > 0 || Boolean(item.cover_image_url);

  const factors: ReadinessFactor[] = [
    // Emotional clarity
    {
      key: "why_matters",
      category: "emotional",
      met: Boolean(item.why_this_matters?.trim()),
      weight: 2,
    },
    {
      key: "inspiration",
      category: "emotional",
      met: Boolean(item.quote_inspiration?.trim()) || hasImage,
      weight: 1,
    },
    // Logistics
    {
      key: "target_when",
      category: "logistics",
      met: Boolean(item.target_date || item.target_month),
      weight: 1,
    },
    {
      key: "estimated_cost",
      category: "logistics",
      met: item.estimated_cost != null,
      weight: 1,
    },
    {
      key: "cost_band",
      category: "logistics",
      met: item.cost_band != null,
      weight: 1,
    },
    {
      key: "linked_project",
      category: "logistics",
      met: Boolean(item.linked_project_id),
      weight: 1,
    },
    {
      key: "linked_tasks",
      category: "logistics",
      met: item.linked_task_ids.length > 0,
      weight: 1,
    },
    {
      key: "savings_or_budget",
      category: "logistics",
      met: Boolean(item.linked_savings_goal_id || item.linked_budget_id),
      weight: 1,
    },
    {
      key: "smallest_version",
      category: "logistics",
      met: Boolean(item.ai_reframe_suggestions),
      weight: 1,
    },
    {
      key: "next_step",
      category: "logistics",
      met: Boolean(ctx.hasReport),
      weight: 1,
    },
  ];

  if (item.type === "travel") {
    factors.push(
      {
        key: "travel_fields",
        category: "travel",
        met: Boolean(item.destination_name && item.destination_airport),
        weight: 1,
      },
      {
        key: "destination_brief",
        category: "travel",
        met: Boolean(item.ai_destination_brief),
        weight: 1,
      },
      {
        key: "trip_plan",
        category: "travel",
        met: Boolean(item.ai_trip_plan),
        weight: 1,
      },
      {
        key: "flight_watch",
        category: "travel",
        met: item.flight_watch_enabled,
        weight: 1,
      },
    );
  }

  const sum = (list: ReadinessFactor[]) =>
    list.reduce((acc, f) => acc + (f.met ? f.weight : 0), 0);
  const total = (list: ReadinessFactor[]) =>
    list.reduce((acc, f) => acc + f.weight, 0);

  const emotional = factors.filter((f) => f.category === "emotional");
  const logistics = factors.filter((f) => f.category !== "emotional");

  return {
    score: pct(sum(factors), total(factors)),
    emotionalScore: pct(sum(emotional), total(emotional)),
    logisticsScore: pct(sum(logistics), total(logistics)),
    factors,
  };
}

/** The readiness status enum value implied by the deterministic score + item state. */
export function readinessStatusFromScore(
  item: BucketItem,
  readiness: DreamReadiness,
): "dreaming" | "exploring" | "ready_to_activate" | "scheduled" | "completed" {
  if (item.status === "completed") return "completed";
  if (item.status === "booked" || item.status === "scheduled") return "scheduled";
  if (readiness.score >= 70) return "ready_to_activate";
  if (readiness.score >= 35) return "exploring";
  return "dreaming";
}
