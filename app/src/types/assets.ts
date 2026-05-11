/**
 * Asset domain types for the Resources → Assets sub-tab.
 *
 * `AssetCategoryKey` is the constrained enum persisted to `assets.category_key`.
 * The legacy free-text `category` column remains for historical data written
 * before the enum migration; new writes should target `category_key`.
 */

export const ASSET_CATEGORY_KEYS = [
  "real_estate",
  "vehicle",
  "electronics",
  "musical_instrument",
  "investment",
  "other",
] as const;

export type AssetCategoryKey = (typeof ASSET_CATEGORY_KEYS)[number];

export function isAssetCategoryKey(value: unknown): value is AssetCategoryKey {
  return (
    typeof value === "string" &&
    (ASSET_CATEGORY_KEYS as readonly string[]).includes(value)
  );
}

/**
 * Canonical Asset row shape. Kept in sync with `public.assets` in Supabase
 * and re-exported from `types/database.ts` as the single source of truth.
 */
export type Asset = {
  id: string;
  user_id: string;
  name: string;
  /** Legacy free-text category (historical rows). Prefer `category_key`. */
  category: string | null;
  /** Constrained enum category added in the Resources migration. */
  category_key: AssetCategoryKey | null;
  value: number | null;
  /** Current (mark-to-market) value, distinct from purchase `value`. */
  current_value: number | null;
  location: string | null;
  purchase_date: string | null;
  serial_number: string | null;
  notes: string | null;
  is_favorite: boolean;
  /** Optional link to a row in `public.documents`. */
  document_id: string | null;
  created_at: string;
  updated_at: string;
};
