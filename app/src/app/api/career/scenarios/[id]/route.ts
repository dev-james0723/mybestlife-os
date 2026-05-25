/**
 * DELETE /api/career/scenarios/[id]
 *
 * Deletes one saved scenario owned by the user. Returns { ok }.
 */

import { NextResponse } from "next/server";
import { requireUser } from "../../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("career_scenarios")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
