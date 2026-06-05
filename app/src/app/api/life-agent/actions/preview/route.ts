import { NextResponse } from "next/server";
import { createActionPreviewFromBody } from "@/lib/life-agent/action-preview-service";
import {
  parseSessionGrants,
  requireLifeAgentUser,
} from "@/lib/life-agent/actions-api-shared";

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

  const sessionGrants = parseSessionGrants(body);
  const result = await createActionPreviewFromBody(
    auth.supabase,
    auth.userId,
    body,
    sessionGrants,
  );

  if (!result.ok) {
    return NextResponse.json({ error: "preview_failed", detail: result.error }, { status: 400 });
  }

  return NextResponse.json({ preview: result.preview });
}
