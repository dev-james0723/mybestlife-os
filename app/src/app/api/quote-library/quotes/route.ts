/**
 * Quote Library REST endpoints used by the cross-module SDK.
 *
 * GET  /api/quote-library/quotes                 — list (optional filters)
 * POST /api/quote-library/quotes                 — create
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CreateQuoteSchema } from "@/lib/validators/quote";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const linkedGoalId = url.searchParams.get("linked_goal_id");
  const favoritesOnly = url.searchParams.get("favorites") === "1";

  let query = supabase.from("quotes").select("*");
  if (linkedGoalId) query = query.eq("linked_goal_id", linkedGoalId);
  if (favoritesOnly) query = query.eq("is_favorite", true);
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: "list_failed", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json(data ?? []);
}

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

  const parsed = CreateQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", detail: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      quote_text: parsed.data.quote_text,
      source_author: parsed.data.source_author ?? null,
      source_context: parsed.data.source_context ?? null,
      source_url: parsed.data.source_url ?? null,
      source_type: parsed.data.source_type ?? null,
      source_module: parsed.data.source_module ?? "manual",
      category: parsed.data.category ?? null,
      tags: parsed.data.tags ?? [],
      emotion_tone: parsed.data.emotion_tone ?? null,
      personal_note: parsed.data.personal_note ?? null,
      is_favorite: parsed.data.is_favorite ?? false,
      linked_goal_id: parsed.data.linked_goal_id ?? null,
      language: parsed.data.language ?? "en",
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json(
      { error: "insert_failed", detail: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ quote: data });
}
