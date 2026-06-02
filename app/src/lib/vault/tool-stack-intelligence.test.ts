import { describe, expect, it } from "vitest";
import type { SoftwareVaultEntry } from "@/types/database";
import {
  buildDefaultToolRecommendations,
  buildOverlapAudit,
  buildPageIntelligence,
  buildProjectStack,
  buildSubscriptionAudit,
} from "@/lib/vault/tool-stack-intelligence";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function entry(id: string, overrides: Partial<SoftwareVaultEntry>): SoftwareVaultEntry {
  return {
    id,
    user_id: USER_ID,
    app_name: "Tool",
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
    launch_count: 0,
    last_opened_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("tool stack intelligence", () => {
  const entries = [
    entry("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
      app_name: "Notion",
      website_url: "https://notion.so",
      category: "Notes",
      use_cases: "project documentation and wiki",
      default_tool_for: "Knowledge base",
      is_default_stack: true,
      launch_count: 8,
    }),
    entry("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", {
      app_name: "Notion duplicate",
      website_url: "https://www.notion.so",
      category: "Notes",
      use_cases: "project documentation",
      cost_type: "Subscription",
      cost_amount: 10,
      cost_period: "month",
    }),
    entry("cccccccc-cccc-4ccc-8ccc-cccccccccccc", {
      app_name: "Slack",
      website_url: "https://slack.com",
      category: "Communication",
      use_cases: "team chat and async updates",
      default_tool_for: "Team communication",
    }),
    entry("dddddddd-dddd-4ddd-8ddd-dddddddddddd", {
      app_name: "Cursor",
      website_url: "https://cursor.com",
      category: "Development",
      use_cases: "code editor and AI coding",
      tags: "ai, coding",
      cost_type: "Subscription",
      cost_amount: 20,
      cost_period: "month",
    }),
  ];

  it("builds overlap groups from duplicate host and category signals", () => {
    const audit = buildOverlapAudit(entries);
    expect(audit.summary.totalTools).toBe(4);
    expect(audit.groups.some((group) => group.id.startsWith("duplicate_host_notion"))).toBe(true);
    expect(audit.groups.some((group) => group.title.includes("Dense category"))).toBe(false);
  });

  it("flags paid tools that need subscription review", () => {
    const audit = buildSubscriptionAudit(entries);
    expect(audit.summary.estimatedMonthlyUsd).toBe(30);
    expect(audit.reviews.some((review) => review.action === "cancel_review")).toBe(true);
    expect(audit.reviews.some((review) => review.action === "research_first")).toBe(true);
  });

  it("builds a project stack from selected vault entries", () => {
    const stack = buildProjectStack(entries, {
      targetType: "custom",
      targetName: "Developer knowledge base",
      description: "Docs, code, and team communication",
      selectedEntryIds: [entries[0]!.id, entries[3]!.id],
    });
    expect(stack.items.map((item) => item.appName)).toContain("Notion");
    expect(stack.items.map((item) => item.appName)).toContain("Cursor");
    expect(stack.setupOrder.length).toBeGreaterThan(0);
  });

  it("recommends default tools and computes page intelligence", () => {
    const defaults = buildDefaultToolRecommendations(entries);
    expect(defaults.recommendations.some((rec) => rec.recommendedAppName === "Notion")).toBe(true);

    const page = buildPageIntelligence(entries);
    expect(page.healthScore).toBeLessThanOrEqual(100);
    expect(page.summaryCards.map((card) => card.id)).toContain("spend");
  });
});
