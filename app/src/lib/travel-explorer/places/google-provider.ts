/**
 * GooglePlacesProvider — Places API (New). SERVER-ONLY (uses the secret
 * GOOGLE_PLACES_API_KEY); only ever instantiated inside route handlers.
 *
 * Returns the normalized shapes from `places-provider.ts` — never raw
 * Google payloads. `X-Goog-FieldMask` requests only the fields we render
 * to control response size + cost. `photoUrl()` returns OUR proxy path so
 * the key stays server-side and photo fetches are metered.
 */

import type {
  AutocompleteParams,
  AutocompleteSuggestion,
  NearbySearchParams,
  PlaceDetails,
  PlaceSummary,
  PlacesProvider,
  PriceLevel,
  TextSearchParams,
} from "./places-provider";

const BASE = "https://places.googleapis.com/v1";

const SUMMARY_FIELDS = [
  "id",
  "displayName",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "photos",
  "primaryType",
  "types",
];

const DETAIL_FIELDS = [
  ...SUMMARY_FIELDS,
  "formattedAddress",
  "regularOpeningHours",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "reviews",
];

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  photos?: { name?: string }[];
  primaryType?: string;
  types?: string[];
  formattedAddress?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    text?: { text?: string };
    relativePublishTimeDescription?: string;
    authorAttribution?: { displayName?: string };
  }[];
};

const PRICE_MAP: Record<string, PriceLevel> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export class GooglePlacesProvider implements PlacesProvider {
  readonly provider = "google" as const;

  constructor(private readonly apiKey: string) {}

  private async post(path: string, body: unknown, fieldMask: string): Promise<unknown> {
    const res = await fetch(`${BASE}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`places_http_${res.status}: ${detail.slice(0, 300)}`);
    }
    return res.json();
  }

  async nearby(params: NearbySearchParams): Promise<PlaceSummary[]> {
    const data = (await this.post(
      "places:searchNearby",
      {
        maxResultCount: Math.min(params.maxResults ?? 10, 20),
        rankPreference: "POPULARITY",
        includedTypes: params.includedTypes,
        locationRestriction: {
          circle: {
            center: { latitude: params.lat, longitude: params.lng },
            radius: params.radiusMeters ?? 1500,
          },
        },
      },
      SUMMARY_FIELDS.map((f) => `places.${f}`).join(","),
    )) as { places?: RawPlace[] };
    return (data.places ?? []).map((p) => this.toSummary(p));
  }

  async text(params: TextSearchParams): Promise<PlaceSummary[]> {
    const data = (await this.post(
      "places:searchText",
      {
        textQuery: params.query,
        maxResultCount: 12,
        locationBias: params.bias
          ? {
              circle: {
                center: { latitude: params.bias.lat, longitude: params.bias.lng },
                radius: params.bias.radiusMeters ?? 50000,
              },
            }
          : undefined,
      },
      SUMMARY_FIELDS.map((f) => `places.${f}`).join(","),
    )) as { places?: RawPlace[] };
    return (data.places ?? []).map((p) => this.toSummary(p));
  }

  async autocomplete(params: AutocompleteParams): Promise<AutocompleteSuggestion[]> {
    const data = (await this.post(
      "places:autocomplete",
      {
        input: params.input,
        sessionToken: params.sessionToken,
        locationBias: params.bias
          ? {
              circle: {
                center: { latitude: params.bias.lat, longitude: params.bias.lng },
                radius: params.bias.radiusMeters ?? 50000,
              },
            }
          : undefined,
      },
      "*",
    )) as {
      suggestions?: {
        placePrediction?: {
          placeId?: string;
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
          text?: { text?: string };
        };
      }[];
    };
    return (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
      .map((p) => ({
        provider: "google" as const,
        providerPlaceId: p.placeId!,
        primaryText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        secondaryText: p.structuredFormat?.secondaryText?.text ?? null,
      }));
  }

  async details(providerPlaceId: string): Promise<PlaceDetails | null> {
    const res = await fetch(`${BASE}/places/${encodeURIComponent(providerPlaceId)}`, {
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": DETAIL_FIELDS.join(","),
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`places_http_${res.status}: ${detail.slice(0, 300)}`);
    }
    const p = (await res.json()) as RawPlace;
    return this.toDetails(p);
  }

  photoUrl(photoRef: string, maxPx = 800): string {
    return `/api/travel/places/photo?name=${encodeURIComponent(photoRef)}&max=${maxPx}`;
  }

  private toSummary(p: RawPlace): PlaceSummary {
    return {
      provider: "google",
      providerPlaceId: p.id ?? "",
      name: p.displayName?.text ?? "",
      lat: p.location?.latitude ?? 0,
      lng: p.location?.longitude ?? 0,
      category: p.primaryType ?? p.types?.[0] ?? null,
      rating: p.rating ?? null,
      userRatingCount: p.userRatingCount ?? null,
      priceLevel: p.priceLevel ? PRICE_MAP[p.priceLevel] ?? null : null,
      primaryPhotoRef: p.photos?.[0]?.name ?? null,
    };
  }

  private toDetails(p: RawPlace): PlaceDetails {
    return {
      ...this.toSummary(p),
      address: p.formattedAddress ?? null,
      openingHours: p.regularOpeningHours?.weekdayDescriptions ?? null,
      phone: p.internationalPhoneNumber ?? null,
      website: p.websiteUri ?? null,
      googleMapsUri: p.googleMapsUri ?? null,
      photoRefs: (p.photos ?? []).map((ph) => ph.name).filter((n): n is string => Boolean(n)),
      reviews: (p.reviews ?? []).map((r) => ({
        author: r.authorAttribution?.displayName ?? "Anonymous",
        rating: r.rating ?? 0,
        text: r.text?.text ?? "",
        relativeTime: r.relativePublishTimeDescription ?? "",
      })),
    };
  }
}
