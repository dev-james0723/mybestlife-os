import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchMindMapFromDb } from "@/lib/document-brain/mind-map/generateMindMap";

export const runtime = "nodejs";

function maxIso(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.sort().slice(-1)[0] ?? null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await ctx.params;
  if (!documentId) {
    return NextResponse.json({ error: "invalid_document" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: item, error: itemErr } = await supabase
    .from("knowledge_items")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (itemErr || !item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: analysis, error: aErr } = await supabase
    .from("document_analyses")
    .select("id, status")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (aErr) {
    return NextResponse.json({ error: "analysis_lookup_failed" }, { status: 500 });
  }
  if (!analysis || analysis.status !== "completed") {
    return NextResponse.json({
      nodes: [],
      edges: [],
      generated_at: null,
      status: "missing" as const,
      analysis_status: analysis?.status ?? null,
    });
  }

  const analysisId = analysis.id as string;

  try {
    const { nodes, edges } = await fetchMindMapFromDb(supabase, user.id, analysisId);
    const generatedAt = maxIso(
      nodes.map((n) => n.updated_at || n.created_at).filter((x): x is string => typeof x === "string"),
    );
    if (nodes.length === 0) {
      return NextResponse.json({
        nodes: [],
        edges: [],
        generated_at: null,
        status: "missing" as const,
      });
    }
    return NextResponse.json({
      nodes,
      edges,
      generated_at: generatedAt,
      status: "ready" as const,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/document_mind_map|schema cache/i.test(msg)) {
      return NextResponse.json({
        nodes: [],
        edges: [],
        generated_at: null,
        status: "missing" as const,
        detail: "mind_map_tables_unavailable",
      });
    }
    return NextResponse.json({ error: "mind_map_fetch_failed", detail: msg.slice(0, 200) }, { status: 500 });
  }
}
