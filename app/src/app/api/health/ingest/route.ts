import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeHealthKitSamples, type ShortcutPayload } from "@/lib/health/normalizeHealthKit";

/**
 * POST /api/health/ingest
 *
 * Accepts payloads from the Apple Shortcut (Strategy B). Authenticated via
 * the user's session cookie — the user runs the Shortcut from their iPhone
 * while signed into the web app in Safari on the same device, or we issue
 * a per-user ingest token later. For now, cookie-based auth is the MVP.
 *
 * Body shape:
 *   { samples: HealthKitSample[], syncedAt?: string }
 *
 * Returns: { inserted: number }
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: ShortcutPayload;
  try {
    body = (await request.json()) as ShortcutPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || !Array.isArray(body.samples)) {
    return NextResponse.json({ error: "missing_samples" }, { status: 400 });
  }

  // Cap payload size so a misbehaving Shortcut can't flood us.
  if (body.samples.length > 5000) {
    return NextResponse.json({ error: "too_many_samples" }, { status: 413 });
  }

  const rows = normalizeHealthKitSamples(body.samples, { source: "shortcut" });
  if (rows.length === 0) {
    return NextResponse.json({ inserted: 0, skipped: body.samples.length });
  }

  const payload = rows.map((r) => ({
    user_id: userData.user!.id,
    metric_type: r.metric_type,
    value: r.value,
    unit: r.unit,
    recorded_at: r.recorded_at,
    source: r.source ?? "shortcut",
    metadata: r.metadata ?? null,
  }));

  const { data, error } = await supabase
    .from("health_metrics")
    .upsert(payload, {
      onConflict: "user_id,metric_type,recorded_at,value",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: data?.length ?? 0, skipped: body.samples.length - rows.length });
}
