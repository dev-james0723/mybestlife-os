import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureIdeaCardVisual } from "@/lib/ideas/ensure-idea-card-visual";
import { normalizeIdea } from "@/lib/ideas/normalize-idea";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST `/api/ideas/:ideaId/card-visual`
 *
 * Generates (or regenerates) the card thumbnail only — faster than full auto-enrich.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ ideaId: string }> },
) {
  const { ideaId } = await ctx.params;
  if (!ideaId) {
    return NextResponse.json({ error: "invalid_idea" }, { status: 400 });
  }

  let force = false;
  try {
    const body = (await req.json()) as { force?: boolean };
    force = body.force === true;
  } catch {
    /* empty body ok */
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .eq("user_id", user.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  try {
    const { idea, cardVisual } = await ensureIdeaCardVisual({
      supabase,
      userId: user.id,
      idea: normalizeIdea(row),
      force,
    });
    return NextResponse.json({ idea: normalizeIdea(idea), cardVisual });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ideas/card-visual]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
