import { NextResponse } from "next/server";
import { requireLifeAgentUser } from "@/lib/life-agent/actions-api-shared";
import { runWeeklyReview } from "@/lib/life-agent/workflows/run-workflow";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireLifeAgentUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const review = await runWeeklyReview(auth.supabase, auth.userId, body);
    return NextResponse.json(review);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "review_failed", detail }, { status: 500 });
  }
}
