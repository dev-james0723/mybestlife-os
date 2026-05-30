/**
 * Explorer Console — domain types (Bucket List → Travel sub-tab).
 *
 * Row types mirror the additive tables in
 * `supabase/migrations/20270915000000_travel_explorer_console.sql`
 * (snake_case, matching `types/bucket-list.ts`). App-level runtime
 * contracts (camera engine, Places provider) live alongside in
 * `lib/travel-explorer/engine` and `lib/travel-explorer/places`.
 *
 * ⚠️ COMPLIANCE: Google Places content is never persisted — only
 * `place_id` + the user's own metadata. `display_name`/`lat`/`lng` on a
 * saved place are a render SHELL (short-cache for `google`; ODbL-
 * persistable for `osm`). Re-fetch live content by `place_id` at display.
 *
 * FROZEN CONTRACT (Wave A). Consumers may import; do not edit shapes
 * without coming back to the orchestrator.
 */

export type TravelProvider = "google" | "osm" | "mock" | "manual";
export type PlaceProgress = "want" | "planned" | "visited";

export type TravelPlacesUsageKind =
  | "nearby"
  | "text"
  | "autocomplete"
  | "details"
  | "photos"
  | "tiles_session"
  | "osm_overpass";

export type BoundingBox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

/** Camera framing persisted per city for instant re-fly on return. */
export type LandingParams = {
  center: { lat: number; lng: number; altitude: number };
  tilt: number;
  range: number;
  heading: number;
};

export type TravelDestination = {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  native_name: string | null;
  country: string | null;
  country_code: string | null;
  center_lat: number;
  center_lng: number;
  bbox: BoundingBox | null;
  landing_params: LandingParams | null;
  provider: TravelProvider;
  discovered_place_ids: string[];
  last_fetched_at: string | null;
  bucket_item_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TravelSavedPlace = {
  id: string;
  user_id: string;
  destination_id: string;
  bucket_item_id: string | null;
  provider: TravelProvider;
  place_id: string;
  display_name: string | null;
  lat: number | null;
  lng: number | null;
  category: string | null;
  user_note: string | null;
  color_group: string | null;
  progress: PlaceProgress;
  position: number;
  is_pinned: boolean;
  linked_task_ids: string[];
  created_at: string;
  updated_at: string;
};

export type TravelItineraryDay = {
  id: string;
  user_id: string;
  destination_id: string;
  day_index: number;
  date: string | null;
  title: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type TravelItineraryItem = {
  id: string;
  user_id: string;
  day_id: string;
  saved_place_id: string | null;
  position: number;
  start_time: string | null;
  notes: string | null;
  travel_minutes_to_next: number | null;
  linked_daily_plan_block_id: string | null;
  linked_task_ids: string[];
  created_at: string;
  updated_at: string;
};

export type TravelPlacesUsage = {
  id: string;
  user_id: string;
  usage_date: string;
  kind: TravelPlacesUsageKind;
  count: number;
  created_at: string;
  updated_at: string;
};

/**
 * Per-user daily caps for the cost ledger. Tune freely — mirrors the
 * `BUCKET_AI_DAILY_LIMITS` pattern. Generous for personal use; protects
 * the Google bill from runaway loops.
 */
export const TRAVEL_PLACES_DAILY_LIMITS: Record<TravelPlacesUsageKind, number> = {
  nearby: 300,
  text: 120,
  autocomplete: 600,
  details: 400,
  photos: 800,
  tiles_session: 40,
  osm_overpass: 300,
};

// ── Insert DTOs (id/user_id/timestamps server-assigned) ──────────────
export type TravelDestinationInsert = Partial<
  Omit<TravelDestination, "id" | "user_id" | "created_at" | "updated_at">
> & { slug: string; name: string; center_lat: number; center_lng: number };

export type TravelSavedPlaceInsert = Partial<
  Omit<TravelSavedPlace, "id" | "user_id" | "created_at" | "updated_at">
> & { destination_id: string; provider: TravelProvider; place_id: string };
