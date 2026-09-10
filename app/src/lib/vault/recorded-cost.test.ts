import { describe, expect, it } from "vitest";
import type { SoftwareVaultEntry } from "@/types/database";
import { formatRecordedCost, recordedMonthlyCost, recordedCostTier, compareRecordedCosts, summarizeRecordedCosts } from "./recorded-cost";

const entry = (patch: Partial<SoftwareVaultEntry> = {}) => ({
  cost_type: "Subscription", status: "Active", cost_amount: 120,
  cost_currency: "USD", cost_period: "year", pricing_last_checked_at: "2026-09-08T00:00:00Z", ...patch,
}) as SoftwareVaultEntry;

describe("recorded subscription prices", () => {
  it("keeps currencies separate and excludes unknown or one-time charges", () => {
    const result = summarizeRecordedCosts([
      entry(), entry({cost_amount: 60, cost_period: "quarter"}),
      entry({cost_currency: "hkd", cost_amount: 78, cost_period: "month"}),
      entry({cost_currency: null}), entry({cost_period: null}),
      entry({cost_period: "lifetime", cost_type: "Paid"}), entry({cost_amount: null}),
      entry({status: "Retired"}),
    ], Date.parse("2026-09-08T12:00:00Z"));
    expect(result.totals).toEqual([["HKD", 78], ["USD", 30]]);
    expect(result.excluded).toBe(4);
  });
  it("does not guess an ambiguous billing period", () => {
    for (const period of ["", "one-time", "2 years", "per seat", "monthly or annual", "constructor"]) {
      expect(recordedMonthlyCost(entry({cost_period: period}))).toBeNull();
    }
    expect(recordedMonthlyCost(entry({cost_period: "/month"}))).toBe(120);
    expect(recordedMonthlyCost(entry({cost_period: "每年"}))).toBe(10);
  });
  it("labels currency, missing amounts and missing periods without assuming dollars", () => {
    expect(formatRecordedCost(entry({cost_currency: "EUR"}))).toBe("EUR 120.00 / year");
    expect(formatRecordedCost(entry({cost_amount: null}))).toBe("Amount not recorded");
    expect(formatRecordedCost(entry({cost_currency: null}))).toContain("Currency not recorded");
    expect(formatRecordedCost(entry({cost_period: null}), "zh-HK")).toContain("週期未記錄");
  });
  it("does not classify missing, invalid or non-USD prices as free or a USD price band", () => {
    for (const patch of [{cost_amount: null}, {cost_amount: NaN}, {cost_amount: -1}, {cost_currency: "HKD"}, {cost_period: null}]) {
      expect(recordedCostTier(entry(patch))).toBe("unknown");
    }
    expect(recordedCostTier(entry({cost_type: "Free"}))).toBe("free");
    expect(recordedCostTier(entry())).toBe("mid");
  });
  it("flags old, missing, invalid and future price-check dates without claiming a live check", () => {
    const result = summarizeRecordedCosts([
      entry(), ...[null, "bad-date", "2020-01-01", "2027-01-01"].map(pricing_last_checked_at => entry({pricing_last_checked_at})),
    ], Date.parse("2026-09-08T12:00:00Z"));
    expect(result.unchecked).toBe(4);
  });
  it("sorts currencies into groups and compares monthly amounts only inside each group", () => {
    const records = [entry({cost_amount:null}), entry({cost_amount:120}), entry({cost_amount:240}), entry({cost_currency:"HKD",cost_amount:12})];
    expect(records.sort(compareRecordedCosts).map(e => [e.cost_currency,e.cost_amount])).toEqual([["HKD",12],["USD",240],["USD",120],["USD",null]]);
  });
});
