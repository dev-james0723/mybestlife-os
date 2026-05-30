import { NextResponse } from "next/server";

import { GOOGLE_MAP_TILES_DARK_STYLES } from "@/lib/bucket-list/google-map-tiles";

function resolveMapTilesApiKey(): string | null {
  return (
    process.env.GOOGLE_PLACES_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_TILES_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    null
  );
}

/**
 * Creates a Map Tiles API session server-side (avoids browser CORS on createSession).
 * Uses the same key family as the Travel Explorer 3D globe — not Maps JavaScript API.
 */
export async function POST() {
  const apiKey = resolveMapTilesApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Map Tiles API key is not configured." },
      { status: 503 },
    );
  }

  const upstream = await fetch(
    `https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapType: "roadmap",
        language: "en-US",
        region: "US",
        imageFormat: "png",
        styles: GOOGLE_MAP_TILES_DARK_STYLES,
      }),
      cache: "no-store",
    },
  );

  const payload: unknown = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(
      {
        error: "Failed to create Map Tiles session.",
        details: payload,
      },
      { status: upstream.status },
    );
  }

  return NextResponse.json(payload);
}
