import { NextResponse } from "next/server";

import {
  GOOGLE_MAP_TILES_DARK_STYLES,
  resolveGoogleMapTilesKey,
} from "@/lib/bucket-list/google-map-tiles";

/**
 * Creates a Map Tiles API session server-side (avoids browser CORS on createSession).
 * Uses the same key family as the Travel Explorer 3D globe — not Maps JavaScript API.
 */
export async function POST() {
  const apiKey = resolveGoogleMapTilesKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Map Tiles API key is not configured." },
      { status: 503 },
    );
  }

  try {
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
        signal: AbortSignal.timeout(8_000),
      },
    );

    const payload: unknown = await upstream.json();

    if (
      !upstream.ok ||
      !payload ||
      typeof payload !== "object" ||
      !("session" in payload) ||
      typeof payload.session !== "string" ||
      !payload.session.trim()
    ) {
      throw new Error("Map session unavailable");
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { error: "Google map detail is temporarily unavailable." },
      { status: 503 },
    );
  }
}
