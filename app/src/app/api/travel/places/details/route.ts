/**
 * GET /api/travel/places/details?placeId=
 *
 * Full POI detail for the popup — Place Details (New). Server-side + metered.
 * COMPLIANCE: the response is render-time content (re-fetched by place_id);
 * never persist it for google rows — store only the place_id + user metadata.
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
import type { DetailsResponse } from "@/lib/travel-explorer/places/places-provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireTravelContext();
  if (!auth.ok) return auth.response;

  const placeId = new URL(request.url).searchParams.get("placeId");
  if (!placeId) {
    return NextResponse.json({ error: "missing_place_id" }, { status: 400 });
  }

  const quota = await assertTravelPlacesQuota(auth.ctx, "details");
  if (!quota.ok) return quota.response;

  const key = getPlacesKeyOrFail();
  if (!key.ok) return key.response;

  try {
    const provider = new GooglePlacesProvider(key.apiKey);
    const place = await provider.details(placeId);
    await recordTravelPlacesUsage(auth.ctx, "details");
    const body: DetailsResponse = {
      place,
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
