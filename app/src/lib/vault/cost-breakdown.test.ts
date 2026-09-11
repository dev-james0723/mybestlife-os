import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SoftwareVaultEntry } from "@/types/database";
import { buildRecordedCostBreakdown } from "./cost-breakdown";
import { summarizeRecordedCosts } from "./recorded-cost";

const NOW = Date.parse("2026-09-10T12:00:00Z");
function entry(id: string, overrides: Partial<SoftwareVaultEntry> = {}): SoftwareVaultEntry {
  return {
    id, app_name: id, status: "Active", cost_type: "Subscription",
    cost_amount: 20, cost_currency: "USD", cost_period: "monthly",
    pricing_last_checked_at: "2026-09-10T00:00:00Z", ...overrides,
  } as SoftwareVaultEntry;
}

describe("recorded monthly cost breakdown", () => {
  it("normalizes annual and quarterly charges and sorts by monthly amount", () => {
    const result = buildRecordedCostBreakdown([
      entry("Annual", { cost_amount: 120, cost_period: "annual" }),
      entry("Monthly"),
      entry("Quarterly", { cost_amount: 90, cost_period: "quarterly" }),
    ], NOW);
    expect(result.groups[0].total).toBe(60);
    expect(result.groups[0].rows.map((row) => [row.entry.id, row.monthlyAmount])).toEqual([
      ["Quarterly", 30], ["Monthly", 20], ["Annual", 10],
    ]);
  });

  it("keeps currencies separate and normalizes currency whitespace and case", () => {
    const { groups } = buildRecordedCostBreakdown([
      entry("Dollar"), entry("Dollar annual", { cost_amount: 120, cost_period: "year", cost_currency: " usd " }),
      entry("HK", { cost_amount: 156, cost_currency: "hkd" }),
    ], NOW);
    expect(groups.map(({ currency, total }) => [currency, total])).toEqual([["HKD", 156], ["USD", 30]]);
    expect(groups[0].rows[0].share).toBe(100);
  });

  it("only includes active Paid and Subscription records", () => {
    const result = buildRecordedCostBreakdown([
      entry("Paid", { cost_type: "Paid" }), entry("Subscription"),
      entry("Retired", { status: "Retired" }), entry("Testing", { status: "Testing" }),
      entry("Wishlist", { status: "Wishlist" }), entry("Free", { cost_type: "Free", cost_amount: 0 }),
    ], NOW);
    expect(result.groups[0].rows.map((row) => row.entry.id)).toEqual(["Paid", "Subscription"]);
    expect(result.activeCount).toBe(3);
    expect(result.freeCount).toBe(1);
    expect(result.excluded).toBe(0);
  });

  it("does not invent monthly prices for incomplete or one-time records", () => {
    const result = buildRecordedCostBreakdown([
      entry("No amount", { cost_amount: null }), entry("No currency", { cost_currency: " " }),
      entry("No period", { cost_period: null }), entry("One-time", { cost_period: "one-time" }),
    ], NOW);
    expect(result.groups).toEqual([]);
    expect(result.excluded).toBe(4);
  });

  it("rejects negative and non-finite prices", () => {
    const result = buildRecordedCostBreakdown([
      entry("Negative", { cost_amount: -1 }), entry("Infinity", { cost_amount: Infinity }),
      entry("NaN", { cost_amount: NaN }),
    ], NOW);
    expect(result.excluded).toBe(3);
    expect(result.groups).toEqual([]);
  });

  it("preserves known zero charges without NaN shares", () => {
    const result = buildRecordedCostBreakdown([entry("Zero", { cost_amount: 0 })], NOW);
    expect(result.groups[0].total).toBe(0);
    expect(result.groups[0].rows[0].share).toBe(0);
  });

  it("returns an honest empty state for empty or all-free libraries", () => {
    expect(buildRecordedCostBreakdown([], NOW)).toEqual({ groups: [], excluded: 0, unchecked: 0, activeCount: 0, freeCount: 0 });
    const result = buildRecordedCostBreakdown([entry("Free", { cost_type: "Free", cost_currency: "" })], NOW);
    expect(result.groups).toEqual([]);
    expect(result.freeCount).toBe(1);
    expect(result.excluded).toBe(0);
  });

  it("sorts equal prices deterministically without modifying stored entries", () => {
    const entries = [entry("z", { app_name: "Zulu" }), entry("b", { app_name: "Alpha" }), entry("a", { app_name: "Alpha" })];
    const before = structuredClone(entries);
    expect(buildRecordedCostBreakdown(entries, NOW).groups[0].rows.map((row) => row.entry.id)).toEqual(["a", "b", "z"]);
    expect(entries).toEqual(before);
  });

  it("reconciles every chart row and percentage with its currency total", () => {
    const { groups } = buildRecordedCostBreakdown([
      entry("Weekly", { cost_amount: 3, cost_period: "week" }),
      entry("Daily", { cost_amount: 1, cost_period: "day" }), entry("Monthly"),
    ], NOW);
    for (const group of groups) {
      expect(group.rows.reduce((sum, row) => sum + row.monthlyAmount, 0)).toBeCloseTo(group.total, 10);
      expect(group.rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(100, 10);
      expect(group.rows.every((row) => Number.isFinite(row.share) && row.share >= 0 && row.share <= 100)).toBe(true);
    }
  });

  it("preserves the original summary totals and pricing-review warnings", () => {
    const entries = [entry("Old", { pricing_last_checked_at: "2025-01-01" }), entry("No date", { pricing_last_checked_at: null }), entry("Future", { pricing_last_checked_at: "2027-01-01" }), entry("Fresh")];
    const expected = summarizeRecordedCosts(entries, NOW);
    const actual = buildRecordedCostBreakdown(entries, NOW);
    expect(actual.groups.map(({ currency, total }) => [currency, total])).toEqual(expected.totals);
    expect(actual.unchecked).toBe(3);
    expect(actual.excluded).toBe(expected.excluded);
  });
});

describe("Tools and Subscriptions layout regression", () => {
  const source = readFileSync(new URL("../../components/vault/VaultInterior.tsx", import.meta.url), "utf8");

  it("removes both unwanted sections from the page rather than hiding them", () => {
    expect(source).not.toContain("VaultIntelligenceCommandCenter");
    expect(source).not.toContain("VaultOverlapInsightsCard");
  });

  it("places one cost dashboard above the filters, outside the page header", () => {
    const header = source.slice(source.indexOf("actions={"), source.indexOf("<VaultSoftwareModeTabs"));
    expect(header).not.toContain("VaultCostDashboard");
    expect(source.match(/<VaultCostDashboard\b/g)).toHaveLength(1);
    expect(source.indexOf("<VaultCostDashboard")).toBeLessThan(source.indexOf("<VaultFilterBar"));
    expect(source).toContain("onSelectEntry={selectEntry}");
    expect(source).toContain("<AlertDialog open={!!deleteId}");
  });
});
