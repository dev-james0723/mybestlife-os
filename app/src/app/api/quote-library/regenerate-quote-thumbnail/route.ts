/**
 * POST /api/quote-library/regenerate-quote-thumbnail
 *
 * Body: { quote_id: string }
 *
 * Force-regenerate the thumbnail for an existing quote — wipes prior storage
 * objects, re-runs the analyzer, re-renders the image. Used by the "Regenerate
 * thumbnail" button in the detail dialog and by the retry affordance on
 * failed states.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { regenerateQuoteThumbnail } from "@/lib/quote-library/thumbnail/pipeline";

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
  const { quote_id } = body as { quote_id?: unknown };
  if (typeof quote_id !== "string" || quote_id.length === 0) {
    return NextResponse.json({ error: "missing_quote_id" }, { status: 400 });
  }

  try {
    const result = await regenerateQuoteThumbnail({
      supabase,
      userId: userData.user.id,
      quoteId: quote_id,
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
      modelUsed: result.modelUsed,
    });
  } catch (e) {
    // Surface the actual cause to the client so the toast can explain it.
    // Common failures we care about here: missing migration columns,
    // missing storage bucket, Supabase RLS rejection, Gemini quota.
    const detail = e instanceof Error ? e.message : String(e);
    if (process.env.NODE_ENV !== "production") {
      console.error("[quote-thumbnail] regenerate route failed:", detail);
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
