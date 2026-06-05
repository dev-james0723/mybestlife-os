import { NextResponse } from "next/server";
import { requireLifeAgentUser } from "@/lib/life-agent/actions-api-shared";
import { runDailyBrief, parseDisplayNameFromBody } from "@/lib/life-agent/workflows/run-workflow";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireLifeAgentUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const brief = await runDailyBrief(
      auth.supabase,
      auth.userId,
      body,
      parseDisplayNameFromBody(body),
    );
    return NextResponse.json(brief);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "brief_failed", detail }, { status: 500 });
  }
}
