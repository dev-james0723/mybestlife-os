/**
 * POST /api/quote-library/seed
 *
 * Loads the 30 curated starter quotes into the current user's library if
 * they don't have any seed rows yet. Idempotent: repeat calls are no-ops.
 *
 * DELETE /api/quote-library/seed
 *
 * Removes every `is_seed = true` row belonging to the user.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SEED_QUOTES } from "@/lib/quote-library/seed-quotes";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { count, error: countError } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .eq("is_seed", true);
  if (countError) {
    return NextResponse.json(
      { error: "count_failed", detail: countError.message },
      { status: 500 },
    );
  }
  if ((count ?? 0) >= SEED_QUOTES.length) {
    return NextResponse.json({ seeded: false, alreadySeeded: true });
  }

  const rows = SEED_QUOTES.map((seed) => ({
    quote_text: seed.quote_text,
    source_author: seed.source_author,
    source_context: seed.source_context,
    category: seed.category,
    tags: seed.tags,
    emotion_tone: seed.emotion_tone,
    language: seed.language,
    source_module: "import" as const,
    is_seed: true,
    is_ai_enriched: false,
    confidence_score: 1,
  }));

  const { error: insertError } = await supabase.from("quotes").insert(rows);
  if (insertError) {
    return NextResponse.json(
      { error: "insert_failed", detail: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ seeded: true, count: rows.length });
}

export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { error } = await supabase.from("quotes").delete().eq("is_seed", true);
  if (error) {
    return NextResponse.json(
      { error: "delete_failed", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ cleared: true });
}
