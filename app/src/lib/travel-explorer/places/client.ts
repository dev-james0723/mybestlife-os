/**
 * Browser-side fetchers for the Places proxy. Thin typed wrappers around
 * the `/api/travel/places/*` route handlers — the key + metering live
 * server-side; the client only ever sees normalized shapes.
 */

import type {
  AutocompleteResponse,
  DetailsResponse,
  NearbyResponse,
  TextResponse,
} from "./places-provider";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`places_client_http_${res.status}`);
  return (await res.json()) as T;
}

export function fetchNearby(lat: number, lng: number, max = 10): Promise<NearbyResponse> {
  return getJson<NearbyResponse>(
    `/api/travel/places/nearby?lat=${lat}&lng=${lng}&max=${max}`,
  );
}

export function fetchPlaceDetails(placeId: string): Promise<DetailsResponse> {
  return getJson<DetailsResponse>(
    `/api/travel/places/details?placeId=${encodeURIComponent(placeId)}`,
  );
}

export function searchPlacesText(query: string, bias?: { lat: number; lng: number }): Promise<TextResponse> {
  const q = new URLSearchParams({ q: query });
  if (bias) {
    q.set("lat", String(bias.lat));
    q.set("lng", String(bias.lng));
  }
  return getJson<TextResponse>(`/api/travel/places/text?${q.toString()}`);
}

export function autocompletePlaces(
  input: string,
  opts?: { bias?: { lat: number; lng: number }; session?: string },
): Promise<AutocompleteResponse> {
  const q = new URLSearchParams({ input });
  if (opts?.bias) {
    q.set("lat", String(opts.bias.lat));
    q.set("lng", String(opts.bias.lng));
  }
  if (opts?.session) q.set("session", opts.session);
  return getJson<AutocompleteResponse>(`/api/travel/places/autocomplete?${q.toString()}`);
}

/** Build a proxied Place Photo URL (key stays server-side). */
export function placePhotoUrl(photoRef: string, maxPx = 800): string {
  return `/api/travel/places/photo?name=${encodeURIComponent(photoRef)}&max=${maxPx}`;
}
