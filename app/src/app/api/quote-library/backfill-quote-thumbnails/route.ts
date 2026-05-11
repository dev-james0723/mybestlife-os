/**
 * POST /api/quote-library/backfill-quote-thumbnails
 *
 * Body: { limit?: number, force?: boolean }
 *
 * Generates thumbnails for the caller's existing quotes that don't yet have
 * a `completed` thumbnail (or all quotes when `force=true`). Processes a
 * small batch per request — call multiple times to cover a large library.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { backfillMissingQuoteThumbnails } from "@/lib/quote-library/thumbnail/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = (await request.json()) ?? {};
  } catch {
    body = {};
  }
  const { limit, force } = (body ?? {}) as {
    limit?: unknown;
    force?: unknown;
  };

  const parsedLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? Math.max(1, Math.min(50, Math.floor(limit)))
      : 8;

  try {
    const summary = await backfillMissingQuoteThumbnails({
      supabase,
      userId: userData.user.id,
      limit: parsedLimit,
      force: force === true,
    });
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "backfill_failed",
      },
      { status: 500 },
    );
  }
}
