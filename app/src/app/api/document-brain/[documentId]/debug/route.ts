import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

  const { data: item } = await supabase
    .from("knowledge_items")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: analysis } = await supabase
    .from("document_analyses")
    .select("id, parser_version, status")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  const analysisId = analysis?.id as string | undefined;

  const countFor = async (table: string) => {
    if (!analysisId) return 0;
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id);
    if (error) return -1;
    return count ?? 0;
  };

  const [pages, sections, chunks, glossary, visuals] = await Promise.all([
    countFor("document_pages"),
    countFor("document_sections"),
    countFor("document_chunks"),
    countFor("document_glossary_terms"),
    countFor("document_visual_assets"),
  ]);

  const { data: job } = await supabase
    .from("document_extraction_jobs")
    .select("output_base_path")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const base = typeof job?.output_base_path === "string" ? job.output_base_path.trim() : "";
  const manifestPath = base ? `${base}/mineru/manifest.json` : null;
  const rawPrefix = base ? `${base}/mineru/raw` : null;

  return NextResponse.json({
    document_id: documentId,
    analysis_exists: Boolean(analysisId),
    analysis_status: analysis?.status ?? null,
    parser_version: analysis?.parser_version ?? null,
    counts: {
      pages,
      sections,
      chunks,
      glossary,
      visuals,
    },
    artifact_manifest_path: manifestPath,
    mineru_raw_output_prefix: rawPrefix,
  });
}
