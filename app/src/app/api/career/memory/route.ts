/**
 * /api/career/memory
 *
 * GET  — list the user's append-only mirror observations (newest first)
 *        → { ok, entries }
 * POST — body { kind: string, content: object, source?: string }: insert one
 *        observation → { ok, entry }
 */

import { NextResponse } from "next/server";
import type { CareerMemoryEntry } from "@/types/database";
import { requireUser, readJsonBody } from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("career_memory")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
  return NextResponse.json({
    ok: true,
    entries: (data as CareerMemoryEntry[]) ?? [],
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const kind = typeof body.kind === "string" ? body.kind.trim() : "";
  if (!kind) {
    return NextResponse.json({ error: "missing_kind" }, { status: 400 });
  }
  const content =
    body.content && typeof body.content === "object" && !Array.isArray(body.content)
      ? (body.content as Record<string, unknown>)
      : {};
  const source =
    typeof body.source === "string" && body.source.trim().length > 0
      ? body.source.trim()
      : null;

  const { data: inserted, error } = await supabase
    .from("career_memory")
    .insert({ user_id: user.id, kind, content, source })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }

  return NextResponse.json({ ok: true, entry: inserted as CareerMemoryEntry });
}
