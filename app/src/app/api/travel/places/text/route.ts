/**
 * GET /api/travel/places/text?q=&lat=&lng=
 *
 * Text search (New) — used when the user submits a free-form city/place
 * query. The first result carries the coordinates we use to create a
 * destination + frame the globe. Server-side + metered.
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
import type { GeoBias, TextResponse } from "@/lib/travel-explorer/places/places-provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireTravelContext();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const bias: GeoBias | undefined =
    Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;

  const quota = await assertTravelPlacesQuota(auth.ctx, "text");
  if (!quota.ok) return quota.response;

  const key = getPlacesKeyOrFail();
  if (!key.ok) return key.response;

  try {
    const provider = new GooglePlacesProvider(key.apiKey);
    const items = await provider.text({ query, bias });
    await recordTravelPlacesUsage(auth.ctx, "text");
    return NextResponse.json<TextResponse>({
      items,
      meta: { provider: "google", attributions: [{ label: "Powered by Google" }], cached: false },
    });
  } catch (err) {
    return travelPlacesError(err);
  }
}
