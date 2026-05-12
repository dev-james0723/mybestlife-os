import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateAndPersistMindMap } from "@/lib/document-brain/mind-map/generateMindMap";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(_req: Request, ctx: { params: Promise<{ documentId: string }> }) {
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
    .select("id, document_title, language, summary, status")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (aErr || !analysis) {
    return NextResponse.json({ error: "analysis_not_found" }, { status: 404 });
  }
  if (analysis.status !== "completed") {
    return NextResponse.json({ error: "analysis_not_ready" }, { status: 409 });
  }

  const analysisId = analysis.id as string;

  const [sectionsRes, pagesRes, glossaryRes, visualsRes, chunksRes] = await Promise.all([
    supabase
      .from("document_sections")
      .select("id, title, level, parent_id, page_start, page_end, summary")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .limit(500),
    supabase
      .from("document_pages")
      .select("id, page_number")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .limit(2000),
    supabase
      .from("document_glossary_terms")
      .select("id, term, definition, pages")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .limit(500),
    supabase
      .from("document_visual_assets")
      .select("id, title, source_page_number")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .limit(500),
    supabase
      .from("document_chunks")
      .select("id, page_number, chunk_text")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .limit(120),
  ]);

  if (sectionsRes.error || pagesRes.error || glossaryRes.error || visualsRes.error || chunksRes.error) {
    return NextResponse.json({ error: "data_load_failed" }, { status: 500 });
  }

  try {
    const result = await generateAndPersistMindMap(
      {
        supabase,
        userId: user.id,
        documentId,
        analysisId,
        documentTitle: (analysis.document_title as string | null) ?? null,
        language: (analysis.language as string | null) ?? null,
        summary: (analysis.summary as string | null) ?? null,
      },
      {
        sections: (sectionsRes.data ?? []) as {
          id: string;
          title: string;
          level: number;
          parent_id: string | null;
          page_start: number | null;
          page_end: number | null;
          summary: string | null;
        }[],
        pages: (pagesRes.data ?? []) as { id: string; page_number: number }[],
        glossary: (glossaryRes.data ?? []) as { id: string; term: string; definition: string | null; pages: unknown }[],
        visuals: (visualsRes.data ?? []) as { id: string; title: string | null; source_page_number: number | null }[],
        chunks: (chunksRes.data ?? []) as { id: string; page_number: number | null; chunk_text: string }[],
      },
    );

    const generatedAt =
      result.nodes
        .map((n) => n.updated_at || n.created_at)
        .filter((x): x is string => typeof x === "string")
        .sort()
        .slice(-1)[0] ?? null;

    return NextResponse.json({
      nodes: result.nodes,
      edges: result.edges,
      generated_at: generatedAt,
      status: "ready" as const,
      gemini_used: result.gemini_used,
      gemini_error: result.gemini_error ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "generate_failed", detail: msg.slice(0, 400) }, { status: 500 });
  }
}
