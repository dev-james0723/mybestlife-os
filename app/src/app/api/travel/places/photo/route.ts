/**
 * GET /api/travel/places/photo?name=<places/.../photos/...>&max=
 *
 * Proxies a Place Photo (New) so the API key stays server-side. Streams the
 * image bytes back; short-cached only (Places content is not persisted).
 * Metered against travel_places_usage.
 */

import { NextResponse } from "next/server";

import {
  assertTravelPlacesQuota,
  getPlacesKeyOrFail,
  recordTravelPlacesUsage,
  requireTravelContext,
  travelPlacesError,
} from "@/lib/travel-explorer/places/usage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireTravelContext();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "";
  const max = Math.min(Number(url.searchParams.get("max")) || 800, 1600);

  // SSRF guard: only proxy genuine Places photo resource names.
  if (!name.startsWith("places/") || !name.includes("/photos/")) {
    return NextResponse.json({ error: "invalid_photo_name" }, { status: 400 });
  }

  const quota = await assertTravelPlacesQuota(auth.ctx, "photos");
  if (!quota.ok) return quota.response;

  const key = getPlacesKeyOrFail();
  if (!key.ok) return key.response;

  try {
    const upstream = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${max}&key=${key.apiKey}`,
    );
    if (!upstream.ok) {
      return NextResponse.json({ error: "photo_unavailable" }, { status: 502 });
    }
    const buf = await upstream.arrayBuffer();
    await recordTravelPlacesUsage(auth.ctx, "photos");
    return new NextResponse(buf, {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return travelPlacesError(err);
  }
}
