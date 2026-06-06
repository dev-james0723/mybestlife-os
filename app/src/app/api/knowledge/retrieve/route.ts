import { NextResponse } from "next/server";
import {
  requireKnowledgeUser,
  unauthorizedPayload,
} from "@/lib/knowledge/auth-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  parseRetrieveRequestBody,
  runAskKbRetrieval,
} from "@/lib/retrieval/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireKnowledgeUser();
  if (!auth.ok) {
    return NextResponse.json(unauthorizedPayload(auth), { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const body = parseRetrieveRequestBody(json);
  if (!body.query) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }
  if (body.query.length > 4000) {
    return NextResponse.json({ error: "query_too_long" }, { status: 413 });
  }

  const supabase = await createServerSupabaseClient();

  try {
    const run = await runAskKbRetrieval({
      supabase,
      userId: auth.user.id,
      query: body.query,
      mode: body.mode,
      limit: body.limit,
      sourceDomains: body.sourceDomains,
      sessionGrantedDomains: body.sessionGrantedDomains,
      referenceDateIso: body.referenceDateIso,
      persistRun: true,
    });

    return NextResponse.json({
      retrievalRunId: run.id,
      query: run.query,
      mode: run.mode,
      scope: run.scope,
      sourceChips: run.sourceChips,
      results: run.results,
      warnings: run.warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "retrieval_failed", message: message.slice(0, 500) },
      { status: 500 },
    );
  }
}
