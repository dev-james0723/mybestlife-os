import { NextResponse } from "next/server";
import {
  parseSessionGrants,
  requireLifeAgentUser,
} from "@/lib/life-agent/actions-api-shared";
import { routeUploadIntent } from "@/lib/life-agent/upload-route-intent";
import type {
  LifeAgentUploadAnalysis,
  LifeAgentUploadIntent,
  RouteUploadIntentRequest,
} from "@/lib/life-agent/upload-types";
import { LIFE_AGENT_UPLOAD_INTENTS } from "@/lib/life-agent/upload-types";

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

  const b = body as RouteUploadIntentRequest;
  if (!b.uploadId || typeof b.uploadId !== "string") {
    return NextResponse.json({ error: "upload_id_required" }, { status: 400 });
  }
  if (!b.intent || !LIFE_AGENT_UPLOAD_INTENTS.includes(b.intent)) {
    return NextResponse.json({ error: "invalid_intent" }, { status: 400 });
  }

  const { data: upload, error } = await auth.supabase
    .from("life_agent_uploads")
    .select("id, analysis_json")
    .eq("id", b.uploadId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "load_failed", detail: error.message }, { status: 500 });
  }
  if (!upload?.analysis_json) {
    return NextResponse.json({ error: "upload_not_found" }, { status: 404 });
  }

  const analysis = upload.analysis_json as LifeAgentUploadAnalysis;
  const sessionGrants = parseSessionGrants(body);

  try {
    const result = await routeUploadIntent(
      auth.supabase,
      auth.userId,
      b.uploadId,
      analysis,
      b.intent as LifeAgentUploadIntent,
      typeof b.conversationId === "string" ? b.conversationId : null,
      sessionGrants,
    );
    return NextResponse.json(result);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "route_intent_failed", detail }, { status: 500 });
  }
}
