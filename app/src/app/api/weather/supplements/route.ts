import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchUvAndAirQualityUpstream } from "@/lib/weather/open-meteo";

export const runtime = "nodejs";

/**
 * Proxies Open-Meteo UV + AQI for the Weather page.
 * Same-origin fetch avoids ad-blockers and keeps API keys off the client.
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "invalid_coords" }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "invalid_coords" }, { status: 400 });
  }

  const payload = await fetchUvAndAirQualityUpstream(lat, lon);

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=600" },
  });
}
