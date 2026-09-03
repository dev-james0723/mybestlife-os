import { describe, expect, it } from "vitest";
import type { SoftwareVaultEntry } from "@/types/database";
import { buildVaultUsageAnalytics } from "@/lib/vault/usage-analytics";

function entry(
  id: string,
  appName: string,
  launchCount: number,
  lastOpenedAt: string | null = null,
): SoftwareVaultEntry {
  return {
    id,
    user_id: "00000000-0000-4000-8000-000000000000",
    app_name: appName,
    website_url: null,
    icon_url: null,
    category: null,
    platforms: null,
    use_cases: null,
    status: "Active",
    priority: "Nice-to-have",
    cost_type: "Free",
    cost_amount: null,
    cost_period: null,
    why_i_use_it: null,
    best_feature: null,
    biggest_downside: null,
    best_alternative: null,
    replaces: null,
    tags: null,
    default_tool_for: null,
    summary: null,
    ai_generated_fields: [],
    pricing_plans: [],
    selected_plan_id: null,
    billing_cycle: null,
    cost_currency: "USD",
    alternative_options: [],
    field_sources: [],
    field_confidence: {},
    pricing_last_checked_at: null,
    is_default_stack: false,
    launch_count: launchCount,
    last_opened_at: lastOpenedAt,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("buildVaultUsageAnalytics", () => {
  it("builds totals, shares, rank, and recency from persisted vault counts", () => {
    const analytics = buildVaultUsageAnalytics([
      entry("1", "Claude", 8, "2026-08-30T12:00:00.000Z"),
      entry("2", "Figma", 3, "2026-09-01T12:00:00.000Z"),
      entry("3", "Notion", 0),
    ]);

    expect(analytics.totalUses).toBe(11);
    expect(analytics.trackedTools).toBe(2);
    expect(analytics.mostUsed?.name).toBe("Claude");
    expect(analytics.lastRecorded?.name).toBe("Figma");
    expect(analytics.tools.map((tool) => tool.name)).toEqual([
      "Claude",
      "Figma",
      "Notion",
    ]);
    expect(analytics.tools[0]?.share).toBeCloseTo(8 / 11);
  });

  it("returns a stable empty state when no use has been recorded", () => {
    const analytics = buildVaultUsageAnalytics([
      entry("1", "Claude", 0),
      entry("2", "Figma", 0),
    ]);

    expect(analytics.totalUses).toBe(0);
    expect(analytics.trackedTools).toBe(0);
    expect(analytics.mostUsed).toBeNull();
    expect(analytics.lastRecorded).toBeNull();
    expect(analytics.distribution).toEqual([]);
    expect(analytics.tools.every((tool) => tool.share === 0)).toBe(true);
  });

  it("groups lower-ranked tools into the distribution remainder", () => {
    const analytics = buildVaultUsageAnalytics([
      entry("1", "A", 10),
      entry("2", "B", 9),
      entry("3", "C", 8),
      entry("4", "D", 7),
      entry("5", "E", 6),
      entry("6", "F", 5),
      entry("7", "G", 4),
    ]);

    expect(analytics.distribution).toHaveLength(6);
    expect(analytics.distribution.at(-1)).toEqual({
      id: "other",
      name: "Other",
      count: 9,
    });
  });
});
