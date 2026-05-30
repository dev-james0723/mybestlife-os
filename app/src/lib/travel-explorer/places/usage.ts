/**
 * Server-side auth + per-user daily cost cap for the Places proxy.
 * Mirrors `lib/ai/bucket-list/bucket-ai.ts` but meters
 * `travel_places_usage` instead of AI usage. All Places/Tiles spend is
 * gated here so a runaway client loop can't run up the Google bill.
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  TRAVEL_PLACES_DAILY_LIMITS,
  type TravelPlacesUsageKind,
} from "@/types/travel-explorer";

export type TravelContext = {
  supabase: SupabaseClient;
  userId: string;
};

export async function requireTravelContext(): Promise<
  { ok: true; ctx: TravelContext } | { ok: false; response: NextResponse }
> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }
  return { ok: true, ctx: { supabase, userId: data.user.id } };
}

export function getPlacesKeyOrFail():
  | { ok: true; apiKey: string }
  | { ok: false; response: NextResponse } {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "missing_places_api_key" },
        { status: 500 },
      ),
    };
  }
  return { ok: true, apiKey };
}

export async function assertTravelPlacesQuota(
  ctx: TravelContext,
  kind: TravelPlacesUsageKind,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const limit = TRAVEL_PLACES_DAILY_LIMITS[kind];
  if (!limit || limit === 0) return { ok: true };

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await ctx.supabase
    .from("travel_places_usage")
    .select("count")
    .eq("user_id", ctx.userId)
    .eq("kind", kind)
    .eq("usage_date", today)
    .maybeSingle();

  // Fail-open at personal-use scale (same posture as bucket-ai): a quota
  // read error should not block the user.
  if (error) return { ok: true };

  const used = (data?.count as number | undefined) ?? 0;
  if (used >= limit) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "quota_exceeded", kind, retryAfter: "next UTC midnight" },
        { status: 429 },
      ),
    };
  }
  return { ok: true };
}

export async function recordTravelPlacesUsage(
  ctx: TravelContext,
  kind: TravelPlacesUsageKind,
  increment = 1,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await ctx.supabase
    .from("travel_places_usage")
    .select("count")
    .eq("user_id", ctx.userId)
    .eq("kind", kind)
    .eq("usage_date", today)
    .maybeSingle();

  if (existing) {
    await ctx.supabase
      .from("travel_places_usage")
      .update({ count: (existing.count as number) + increment })
      .eq("user_id", ctx.userId)
      .eq("kind", kind)
      .eq("usage_date", today);
  } else {
    await ctx.supabase.from("travel_places_usage").insert({
      user_id: ctx.userId,
      kind,
      usage_date: today,
      count: increment,
    });
  }
}

export function travelPlacesError(
  error: unknown,
  fallbackStatus = 500,
): NextResponse {
  const msg = error instanceof Error ? error.message : String(error);
  const status = msg.startsWith("places_http_") ? 502 : fallbackStatus;
  return NextResponse.json(
    { error: "places_request_failed", detail: msg.slice(0, 500) },
    { status },
  );
}
