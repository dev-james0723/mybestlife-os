import { NextResponse } from "next/server";
import { requireLifeAgentUser } from "@/lib/life-agent/actions-api-shared";
import { runLifeChapters } from "@/lib/life-agent/intelligence/run-intelligence";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireLifeAgentUser();
  if (!auth.ok) return auth.response;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await runLifeChapters(auth.supabase, auth.userId, body);
    return NextResponse.json(result);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "life_chapters_failed", detail }, { status: 500 });
  }
}
