import { describe, expect, it, beforeEach } from "vitest";
import type { BucketItem } from "@/types/bucket-list";
import {
  buildDreamImageSearchText,
  clearBucketDreamImageCache,
  resolveBucketDreamImage,
} from "@/lib/bucket-list/resolve-bucket-dream-image";

function baseItem(overrides: Partial<BucketItem> = {}): BucketItem {
  return {
    id: "test-id",
    user_id: "user-1",
    title: "Untitled dream",
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

describe("resolveBucketDreamImage", () => {
  beforeEach(() => {
    clearBucketDreamImageCache();
  });

  it("prefers explicit cover_image_url when set", () => {
    const item = baseItem({
      title: "See the Northern Lights in Iceland",
      cover_image_url: "https://example.com/custom.jpg",
    });
    const image = resolveBucketDreamImage(item);
    expect(image.url).toBe("https://example.com/custom.jpg");
    expect(image.sourceType).toBe("api");
  });

  it("labels an AI-generated cover with sourceType 'generated'", () => {
    const item = baseItem({
      title: "See the Northern Lights in Iceland",
      cover_image_url: "https://example.com/generated.png",
      cover_image_is_ai: true,
    });
    const image = resolveBucketDreamImage(item);
    expect(image.url).toBe("https://example.com/generated.png");
    expect(image.sourceType).toBe("generated");
  });

  it("matches Iceland / aurora for Northern Lights seed title", () => {
    const item = baseItem({
      title: "See the Northern Lights in Iceland",
      type: "travel",
      category_tags: ["nature", "winter"],
      destination_name: "Iceland",
    });
    const image = resolveBucketDreamImage(item);
    expect(image.alt.toLowerCase()).toContain("northern lights");
    expect(image.url).toContain("unsplash.com");
  });

  it("matches Japanese language dream", () => {
    const item = baseItem({
      title: "Become conversational in Japanese",
      type: "growth",
      category_tags: ["language", "culture"],
    });
    const text = buildDreamImageSearchText(item);
    expect(text).toContain("japanese");
    const image = resolveBucketDreamImage(item);
    expect(image.url).toContain("unsplash.com");
    expect(
      image.alt.toLowerCase().includes("japan") ||
        image.url.includes("1528164343825") ||
        image.url.includes("1493976040374"),
    ).toBe(true);
  });

  it("matches cabin retreat purchase dream", () => {
    const item = baseItem({
      title: "Own a quiet cabin retreat",
      type: "purchase",
      category_tags: ["home", "nature"],
    });
    const image = resolveBucketDreamImage(item);
    expect(image.alt.toLowerCase()).toContain("cabin");
  });

  it("returns stable cached result for same item", () => {
    const item = baseItem({ title: "Travel to Sri Lanka", type: "travel" });
    const a = resolveBucketDreamImage(item);
    const b = resolveBucketDreamImage(item);
    expect(a.url).toBe(b.url);
  });
});
