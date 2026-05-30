import { describe, it, expect } from "vitest";
import {
  computeDocumentHealth,
  computeRiskFlags,
  clusterAssets,
  clusterKeyForAsset,
} from "@/lib/assets/asset-intelligence-client";
import type { Asset } from "@/types/assets";

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "a1",
    user_id: "u1",
    name: "Test asset",
    category: null,
    category_key: "electronics",
    value: 1000,
    current_value: null,
    location: null,
    purchase_date: null,
    serial_number: null,
    notes: null,
    is_favorite: false,
    document_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeDocumentHealth", () => {
  it("scores a bare asset as critical/weak", () => {
    const health = computeDocumentHealth({
      asset: makeAsset(),
      documentRoles: [],
      imageTypes: [],
    });
    expect(health.score).toBeLessThan(30);
    expect(health.status).toBe("critical");
    expect(health.missingItems).toContain("receipt");
  });

  it("rewards receipts, warranties, photos, and filled fields", () => {
    const health = computeDocumentHealth({
      asset: makeAsset({
        current_value: 900,
        location: "Office",
        purchase_date: "2026-01-01",
        serial_number: "SN123",
      }),
      documentRoles: ["receipt", "warranty", "insurance"],
      imageTypes: ["uploaded_product_photo", "serial_number_photo"],
    });
    expect(health.score).toBeGreaterThanOrEqual(80);
    expect(health.status).toBe("strong");
    expect(health.existingItems).toContain("receipt");
  });

  it("omits serial/warranty relevance for real estate", () => {
    const health = computeDocumentHealth({
      asset: makeAsset({ category_key: "real_estate" }),
      documentRoles: [],
      imageTypes: [],
    });
    expect(health.missingItems).not.toContain("serial_number");
    expect(health.missingItems).not.toContain("warranty");
  });
});

describe("computeRiskFlags", () => {
  it("flags high-value low-doc assets and missing serials", () => {
    const flags = computeRiskFlags({
      asset: makeAsset({ current_value: 3000, serial_number: null }),
      documentHealthScore: 20,
      linkedActivityCount: 0,
    });
    expect(flags).toContain("high_value_low_docs");
    expect(flags).toContain("missing_serial");
    expect(flags).toContain("high_value_low_usage");
    expect(flags).toContain("high_replacement_cost");
  });

  it("does not flag well-documented, used assets", () => {
    const flags = computeRiskFlags({
      asset: makeAsset({ current_value: 200, serial_number: "SN" }),
      documentHealthScore: 90,
      linkedActivityCount: 3,
    });
    expect(flags).not.toContain("high_value_low_docs");
    expect(flags).not.toContain("high_value_low_usage");
  });

  it("flags warranty expiring within 90 days", () => {
    const soon = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const flags = computeRiskFlags({
      asset: makeAsset(),
      documentHealthScore: 80,
      linkedActivityCount: 1,
      warrantyExpirationDate: soon,
    });
    expect(flags).toContain("warranty_expiring");
  });
});

describe("clusterAssets", () => {
  it("maps categories to life-system clusters", () => {
    expect(clusterKeyForAsset(makeAsset({ category_key: "electronics" }))).toBe(
      "creative_production",
    );
    expect(
      clusterKeyForAsset(makeAsset({ category_key: "musical_instrument" })),
    ).toBe("music_performance");
  });

  it("groups assets and sums value, sorted by count", () => {
    const clusters = clusterAssets([
      makeAsset({ id: "1", category_key: "electronics", current_value: 1000 }),
      makeAsset({ id: "2", category_key: "electronics", value: 500 }),
      makeAsset({ id: "3", category_key: "vehicle", value: 20000 }),
    ]);
    expect(clusters[0]!.key).toBe("creative_production");
    expect(clusters[0]!.assets).toHaveLength(2);
    expect(clusters[0]!.totalValue).toBe(1500);
  });
});
