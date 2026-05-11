/**
 * POST /api/quote-library/generate-quote-thumbnail
 *
 * Body:
 *   { quote_id: string, force?: boolean }
 *
 * Runs the full thumbnail pipeline for a single quote. Idempotent — returns
 * the cached thumbnail when one already exists unless `force` is true.
 *
 * Auth: requires the calling user to own the quote (RLS enforces this).
 * Secrets: GEMINI_API_KEY is read on the server only — never exposed.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateQuoteThumbnail } from "@/lib/quote-library/thumbnail/pipeline";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { quote_id, force } = body as {
    quote_id?: unknown;
    force?: unknown;
  };
  if (typeof quote_id !== "string" || quote_id.length === 0) {
    return NextResponse.json({ error: "missing_quote_id" }, { status: 400 });
  }

  try {
    const result = await generateQuoteThumbnail({
      supabase,
      userId: userData.user.id,
      quoteId: quote_id,
      force: force === true,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          quote: result.quote,
          status: result.status,
          error: result.error,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      quote: result.quote,
      cached: result.cached,
      modelUsed: result.modelUsed,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    if (process.env.NODE_ENV !== "production") {
      console.error("[quote-thumbnail] generate route failed:", detail);
    }
    return NextResponse.json(
      {
        ok: false,
        status: "failed" as const,
        error: detail.slice(0, 480),
      },
      { status: 200 },
    );
  }
}
