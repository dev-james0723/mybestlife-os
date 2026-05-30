/**
 * GET /api/travel/places/nearby?lat=&lng=&radius=&max=
 *
 * Live "what's around the camera" discovery via Places Nearby Search (New).
 * Server-side so the key never ships to the client; metered against
 * travel_places_usage. Returns normalized PlaceSummary[] + attribution.
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
import type { NearbyResponse } from "@/lib/travel-explorer/places/places-provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireTravelContext();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }
  const radius = Number(url.searchParams.get("radius")) || undefined;
  const max = Number(url.searchParams.get("max")) || undefined;

  const quota = await assertTravelPlacesQuota(auth.ctx, "nearby");
  if (!quota.ok) return quota.response;

  const key = getPlacesKeyOrFail();
  if (!key.ok) return key.response;

  try {
    const provider = new GooglePlacesProvider(key.apiKey);
    const items = await provider.nearby({
      lat,
      lng,
      radiusMeters: radius,
      maxResults: max,
    });
    await recordTravelPlacesUsage(auth.ctx, "nearby");
    const body: NearbyResponse = {
      items,
      meta: {
        provider: "google",
        attributions: [{ label: "Powered by Google" }],
        cached: false,
      },
    };
    return NextResponse.json(body);
  } catch (err) {
    return travelPlacesError(err);
  }
}
