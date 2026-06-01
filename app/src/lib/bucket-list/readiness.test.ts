import { describe, expect, it } from "vitest";
import type { BucketItem } from "@/types/bucket-list";
import {
  computeDreamReadiness,
  readinessStatusFromScore,
} from "@/lib/bucket-list/readiness";

function baseItem(overrides: Partial<BucketItem> = {}): BucketItem {
  return {
    id: "t",
    user_id: "u",
    title: "Dream",
    description: null,
    why_this_matters: null,
    type: "travel",
    status: "dreaming",
    priority: "medium",
    difficulty: "med",
    time_horizon: null,
    estimated_cost: null,
    cost_currency: "USD",
    cost_band: null,
    target_date: null,
    target_month: null,
    category_tags: [],
    cover_image_url: null,
    cover_image_is_ai: false,
    quote_inspiration: null,
    inspiration_links: [],
    notes: null,
    destination_name: null,
    destination_country: null,
    destination_city: null,
    destination_lat: null,
    destination_lng: null,
    origin_location: null,
    origin_airport: null,
    destination_airport: null,
    best_season: null,
    travel_budget_level: null,
    travel_style: null,
    trip_length_days: null,
    exploratory_price_min: null,
    exploratory_price_max: null,
    latest_live_price: null,
    latest_live_price_currency: null,
    last_price_check_time: null,
    flight_watch_enabled: false,
    price_alert_rule: null,
    ai_destination_brief: null,
    ai_trip_plan: null,
    ai_reframe_suggestions: null,
    linked_project_id: null,
    linked_budget_id: null,
    linked_savings_goal_id: null,
    linked_memory_entry_id: null,
    linked_task_ids: [],
    linked_calendar_event_ids: [],
    linked_knowledge_resource_ids: [],
    is_seed: false,
    is_featured: false,
    archived_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeDreamReadiness", () => {
  it("is 0% for a brand-new empty dream", () => {
    const r = computeDreamReadiness(baseItem());
    expect(r.score).toBe(0);
    expect(r.emotionalScore).toBe(0);
    expect(r.logisticsScore).toBe(0);
  });

  it("rewards emotional clarity independently of logistics", () => {
    const r = computeDreamReadiness(
      baseItem({ why_this_matters: "Because the sky calls me." }),
    );
    expect(r.emotionalScore).toBeGreaterThan(0);
    expect(r.logisticsScore).toBe(0);
  });

  it("rises as logistics + links are added", () => {
    const planned = computeDreamReadiness(
      baseItem({
        why_this_matters: "x",
        target_month: "2027-01",
        estimated_cost: 5000,
        cost_band: "$$$",
        linked_project_id: "p1",
        linked_task_ids: ["t1"],
        linked_savings_goal_id: "s1",
        destination_name: "Iceland",
        destination_airport: "KEF",
        flight_watch_enabled: true,
      }),
      { imageCount: 2, hasReport: true },
    );
    expect(planned.score).toBeGreaterThanOrEqual(60);
    expect(readinessStatusFromScore(baseItem(), planned)).toBe(
      "ready_to_activate",
    );
  });

  it("reports completed status regardless of score", () => {
    const item = baseItem({ status: "completed" });
    const r = computeDreamReadiness(item);
    expect(readinessStatusFromScore(item, r)).toBe("completed");
  });
});
