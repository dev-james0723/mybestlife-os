/**
 * Pure, client-side asset intelligence heuristics.
 *
 * These power the "immediately useful" parts of the Asset Intelligence Hub
 * without an AI round-trip: Document Health, Risk Radar flags, and Asset
 * Cluster grouping. Keeping them pure makes them cheap, instant, and testable.
 *
 * The deeper, narrative intelligence (Why This Asset Matters, Hidden
 * Connections, If This Disappeared Tomorrow, …) is generated on demand by
 * `/api/ai/assets/analyze` and cached — see `asset_intelligence_reports`.
 */

import type { Asset, AssetCategoryKey } from "@/types/assets";
import type {
  AssetDocumentRole,
  AssetImageType,
  AssetDocumentHealth,
  AssetClusterKey,
  AssetRiskFlag,
} from "@/types/asset-intelligence";

// ---------------------------------------------------------------------------
// Document Health
// ---------------------------------------------------------------------------

export type DocumentHealthInput = {
  asset: Pick<
    Asset,
    | "value"
    | "current_value"
    | "location"
    | "purchase_date"
    | "serial_number"
    | "category_key"
  >;
  documentRoles: AssetDocumentRole[];
  imageTypes: AssetImageType[];
};

type HealthItem = {
  key: string;
  weight: number;
  present: boolean;
  /** Whether this item is relevant for the asset's category. */
  relevant: boolean;
};

function buildHealthItems(input: DocumentHealthInput): HealthItem[] {
  const { asset, documentRoles, imageTypes } = input;
  const roles = new Set(documentRoles);
  const images = new Set(imageTypes);
  const cat = asset.category_key;

  // Serial numbers / warranties matter for electronics, vehicles, instruments
  // but not for real estate or investments.
  const physical =
    cat === "electronics" ||
    cat === "vehicle" ||
    cat === "musical_instrument" ||
    cat === "other" ||
    cat == null;

  return [
    {
      key: "receipt",
      weight: 2,
      present: roles.has("receipt") || roles.has("invoice"),
      relevant: true,
    },
    {
      key: "warranty",
      weight: 1.5,
      present: roles.has("warranty"),
      relevant: physical,
    },
    {
      key: "insurance",
      weight: 1.5,
      present: roles.has("insurance"),
      relevant: true,
    },
    {
      key: "serial_number",
      weight: 1,
      present: Boolean(asset.serial_number),
      relevant: physical,
    },
    {
      key: "serial_number_photo",
      weight: 1,
      present: images.has("serial_number_photo"),
      relevant: physical,
    },
    {
      key: "product_photo",
      weight: 1,
      present:
        images.has("uploaded_product_photo") ||
        images.has("generated_product_image") ||
        images.has("condition_photo"),
      relevant: true,
    },
    {
      key: "purchase_date",
      weight: 1,
      present: Boolean(asset.purchase_date),
      relevant: true,
    },
    {
      key: "current_value",
      weight: 1,
      present: asset.current_value != null,
      relevant: true,
    },
    {
      key: "location",
      weight: 0.5,
      present: Boolean(asset.location),
      relevant: true,
    },
  ];
}

export function computeDocumentHealth(
  input: DocumentHealthInput,
): AssetDocumentHealth {
  const items = buildHealthItems(input).filter((i) => i.relevant);
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const presentWeight = items
    .filter((i) => i.present)
    .reduce((s, i) => s + i.weight, 0);
  const score =
    totalWeight === 0 ? 0 : Math.round((presentWeight / totalWeight) * 100);

  const missingItems = items.filter((i) => !i.present).map((i) => i.key);
  const existingItems = items.filter((i) => i.present).map((i) => i.key);

  const status: AssetDocumentHealth["status"] =
    score >= 80 ? "strong" : score >= 55 ? "okay" : score >= 30 ? "weak" : "critical";

  return {
    score,
    status,
    missingItems,
    existingItems,
    explanation: "",
  };
}

// ---------------------------------------------------------------------------
// Risk flags
// ---------------------------------------------------------------------------

const HIGH_VALUE_THRESHOLD = 1500;

export type RiskFlagInput = {
  asset: Asset;
  documentHealthScore: number;
  /** Number of linked Life OS items (projects/tasks/notes/goals). */
  linkedActivityCount: number;
  warrantyExpirationDate?: string | null;
};

export function computeRiskFlags(input: RiskFlagInput): AssetRiskFlag[] {
  const { asset, documentHealthScore, linkedActivityCount } = input;
  const flags: AssetRiskFlag[] = [];
  const effectiveValue = asset.current_value ?? asset.value ?? 0;
  const isHighValue = effectiveValue >= HIGH_VALUE_THRESHOLD;

  if (isHighValue && documentHealthScore < 50) {
    flags.push("high_value_low_docs");
  }
  if (isHighValue && linkedActivityCount === 0) {
    flags.push("high_value_low_usage");
  }
  if (
    (asset.category_key === "electronics" ||
      asset.category_key === "vehicle" ||
      asset.category_key === "musical_instrument") &&
    !asset.serial_number
  ) {
    flags.push("missing_serial");
  }
  if (isHighValue) {
    flags.push("high_replacement_cost");
  }
  if (isHighValue && linkedActivityCount === 0 && documentHealthScore < 50) {
    flags.push("good_sell_candidate");
  }

  if (input.warrantyExpirationDate) {
    const days =
      (new Date(input.warrantyExpirationDate).getTime() - Date.now()) /
      86_400_000;
    if (days > 0 && days <= 90) flags.push("warranty_expiring");
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Clusters
// ---------------------------------------------------------------------------

export const ASSET_CLUSTER_FOR_CATEGORY: Record<
  AssetCategoryKey,
  AssetClusterKey
> = {
  real_estate: "home_living",
  vehicle: "travel_mobility",
  electronics: "creative_production",
  musical_instrument: "music_performance",
  investment: "investment",
  other: "business_operations",
};

export function clusterKeyForAsset(asset: Asset): AssetClusterKey {
  if (asset.category_key) return ASSET_CLUSTER_FOR_CATEGORY[asset.category_key];
  return "business_operations";
}

export type AssetCluster = {
  key: AssetClusterKey;
  assets: Asset[];
  totalValue: number;
};

export function clusterAssets(assets: Asset[]): AssetCluster[] {
  const map = new Map<AssetClusterKey, Asset[]>();
  for (const asset of assets) {
    const key = clusterKeyForAsset(asset);
    const list = map.get(key) ?? [];
    list.push(asset);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .map(([key, clusterAssetList]) => ({
      key,
      assets: clusterAssetList,
      totalValue: clusterAssetList.reduce(
        (s, a) => s + (a.current_value ?? a.value ?? 0),
        0,
      ),
    }))
    .sort((a, b) => b.assets.length - a.assets.length);
}
