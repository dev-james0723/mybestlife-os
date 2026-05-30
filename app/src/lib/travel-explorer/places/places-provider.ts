/**
 * Places provider abstraction + HTTP route I/O. FROZEN CONTRACT (Wave A).
 *
 * Implementations:
 *   - GooglePlacesProvider  paid, primary — Places API (New)
 *   - OsmPlacesProvider     free — Overpass / Nominatim (ODbL, attributed)
 *   - MockPlacesProvider    deterministic fixtures for dev / tests
 *
 * The UI only ever sees the normalized shapes below — never raw provider
 * payloads. All network calls happen SERVER-side in `/api/travel/places/*`
 * so the key is never exposed; each call is metered against
 * `travel_places_usage` for cost control.
 *
 * ⚠️ COMPLIANCE: only `providerPlaceId` is persistable long-term. Every
 * other field here is render-time content and must NOT be written to
 * Supabase for `google` rows — re-fetch by place_id at display time.
 */
import type { TravelProvider } from "@/types/travel-explorer";

export type PriceLevel = 0 | 1 | 2 | 3 | 4;

export type PlaceSummary = {
  provider: TravelProvider;
  providerPlaceId: string;
  name: string;
  lat: number;
  lng: number;
  category: string | null;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: PriceLevel | null;
  /** Opaque photo reference resolved to a URL via `photoUrl()`. */
  primaryPhotoRef: string | null;
};

export type PlaceReview = {
  author: string;
  rating: number;
  text: string;
  relativeTime: string;
};

export type PlaceDetails = PlaceSummary & {
  address: string | null;
  openingHours: string[] | null;
  phone: string | null;
  website: string | null;
  googleMapsUri: string | null;
  photoRefs: string[];
  reviews: PlaceReview[];
  /** Optional secondary source (gated behind TRIPADVISOR_API_KEY). */
  tripadvisorRating?: number | null;
};

export type GeoBias = { lat: number; lng: number; radiusMeters?: number };

export type NearbySearchParams = {
  lat: number;
  lng: number;
  radiusMeters?: number;
  /** Cap for clutter + cost (≈6–10 top-rated). */
  maxResults?: number;
  includedTypes?: string[];
};

export type TextSearchParams = { query: string; bias?: GeoBias };

export type AutocompleteParams = {
  input: string;
  /** Session token for Autocomplete billing (one session per search). */
  sessionToken?: string;
  bias?: GeoBias;
};

export type AutocompleteSuggestion = {
  provider: TravelProvider;
  providerPlaceId: string;
  primaryText: string;
  secondaryText: string | null;
};

export interface PlacesProvider {
  readonly provider: TravelProvider;
  nearby(params: NearbySearchParams): Promise<PlaceSummary[]>;
  text(params: TextSearchParams): Promise<PlaceSummary[]>;
  autocomplete(params: AutocompleteParams): Promise<AutocompleteSuggestion[]>;
  details(providerPlaceId: string): Promise<PlaceDetails | null>;
  /** Build a (short-lived) photo URL, proxied so the key stays server-side. */
  photoUrl(photoRef: string, maxPx?: number): string;
}

// ── HTTP route I/O (server handlers under /api/travel/places/*) ──────────
export type Attribution = { label: string; url?: string };

export type PlacesResponseMeta = {
  provider: TravelProvider;
  /** ALWAYS rendered — Google + photo attribution is a ToS requirement. */
  attributions: Attribution[];
  cached: boolean;
};

export type NearbyResponse = { items: PlaceSummary[]; meta: PlacesResponseMeta };
export type TextResponse = { items: PlaceSummary[]; meta: PlacesResponseMeta };
export type AutocompleteResponse = {
  suggestions: AutocompleteSuggestion[];
  meta: PlacesResponseMeta;
};
export type DetailsResponse = {
  place: PlaceDetails | null;
  meta: PlacesResponseMeta;
};

/** 429 body when the per-user daily cap (travel_places_usage) is hit. */
export type PlacesQuotaError = {
  error: "quota_exceeded";
  kind: string;
  retryAfter: string;
};
