/**
 * GET /api/travel/places/autocomplete?input=&lat=&lng=&session=
 *
 * City/place search suggestions (Autocomplete New). Session token passed
 * through for autocomplete billing. Server-side + metered.
 */

import { NextResponse } from "next/server";

import { GooglePlacesProvider } from "@/lib/travel-explorer/places/google-provider";
import {
  assertTravelPlacesQuota,
  getPlacesKeyOrFail,
  recordTravelPlacesUsage,
  requireTravelContext,
  travelPlacesError,
} from "@/lib/travel-explorer/places/usage";
import type { AutocompleteResponse, GeoBias } from "@/lib/travel-explorer/places/places-provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireTravelContext();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const input = (url.searchParams.get("input") ?? "").trim();
  if (input.length < 2) {
    return NextResponse.json<AutocompleteResponse>({
      suggestions: [],
      meta: { provider: "google", attributions: [], cached: false },
    });
  }
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const bias: GeoBias | undefined =
    Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
  const sessionToken = url.searchParams.get("session") ?? undefined;

  const quota = await assertTravelPlacesQuota(auth.ctx, "autocomplete");
  if (!quota.ok) return quota.response;

  const key = getPlacesKeyOrFail();
  if (!key.ok) return key.response;

  try {
    const provider = new GooglePlacesProvider(key.apiKey);
    const suggestions = await provider.autocomplete({ input, bias, sessionToken });
    await recordTravelPlacesUsage(auth.ctx, "autocomplete");
    return NextResponse.json<AutocompleteResponse>({
      suggestions,
      meta: { provider: "google", attributions: [{ label: "Powered by Google" }], cached: false },
    });
  } catch (err) {
    return travelPlacesError(err);
  }
}
