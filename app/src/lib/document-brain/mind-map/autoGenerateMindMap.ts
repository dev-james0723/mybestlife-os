import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { generateAndPersistMindMap } from "@/lib/document-brain/mind-map/generateMindMap";

const LOG = "[doc-oracle/mind-map]";

export type AutoGenerateMindMapReason = "extraction_completed" | "first_open_fallback" | "retry";

export async function autoGenerateMindMapForDocument(input: {
  userId: string;
  documentId: string;
  reason: AutoGenerateMindMapReason;
  /** When false (default), skip if mind map rows already exist for the analysis. */
  force?: boolean;
}): Promise<{
  ok: boolean;
  generated: boolean;
  skipped?: string;
  error?: string;
}> {
  const force = input.force === true;
  const docId = input.documentId.trim();
  const userId = input.userId.trim();

  try {
    console.info(`${LOG} auto_generation_started document_id=${docId} reason=${input.reason} force=${force}`);

    let admin: ReturnType<typeof createServiceRoleSupabaseClient>;
    try {
      admin = createServiceRoleSupabaseClient();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${LOG} auto_generation_failed error=${msg.slice(0, 240)}`);
      return { ok: false, generated: false, error: "service_client_unavailable" };
    }

    const { data: item, error: itemErr } = await admin
      .from("knowledge_items")
      .select("id")
      .eq("id", docId)
      .eq("user_id", userId)
      .maybeSingle();
    if (itemErr || !item) {
      console.info(`${LOG} auto_generation_skipped reason=document_not_found document_id=${docId}`);
      return { ok: true, generated: false, skipped: "document_not_found" };
    }

    const { data: analysis, error: aErr } = await admin
      .from("document_analyses")
      .select("id, document_title, language, summary, status")
      .eq("document_id", docId)
      .eq("user_id", userId)
      .maybeSingle();
    if (aErr || !analysis) {
      console.info(`${LOG} auto_generation_skipped reason=no_analysis document_id=${docId}`);
      return { ok: true, generated: false, skipped: "no_analysis" };
    }
    if (analysis.status !== "completed") {
      console.info(`${LOG} auto_generation_skipped reason=analysis_not_completed document_id=${docId}`);
      return { ok: true, generated: false, skipped: "analysis_not_completed" };
    }

    const analysisId = analysis.id as string;

    const { count: existingCount, error: countErr } = await admin
      .from("document_mind_map_nodes")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", analysisId)
      .eq("user_id", userId);

    if (countErr) {
      const msg = countErr.message ?? String(countErr);
      if (/document_mind_map|schema cache/i.test(msg)) {
        console.warn(`${LOG} auto_generation_skipped reason=mind_map_tables_unavailable document_id=${docId}`);
        return { ok: true, generated: false, skipped: "mind_map_tables_unavailable" };
      }
      console.error(`${LOG} auto_generation_failed error=${msg.slice(0, 240)}`);
      return { ok: false, generated: false, error: msg.slice(0, 200) };
    }

    if (!force && (existingCount ?? 0) > 0) {
      console.info(`${LOG} auto_generation_skipped reason=already_exists document_id=${docId}`);
      return { ok: true, generated: false, skipped: "already_exists" };
    }

    const [sectionsRes, pagesRes, glossaryRes, visualsRes, chunksRes] = await Promise.all([
      admin
        .from("document_sections")
        .select("id, title, level, parent_id, page_start, page_end, summary")
        .eq("analysis_id", analysisId)
        .eq("user_id", userId)
        .limit(500),
      admin
        .from("document_pages")
        .select("id, page_number")
        .eq("analysis_id", analysisId)
        .eq("user_id", userId)
        .limit(2000),
      admin
        .from("document_glossary_terms")
        .select("id, term, definition, pages")
        .eq("analysis_id", analysisId)
        .eq("user_id", userId)
        .limit(500),
      admin
        .from("document_visual_assets")
        .select("id, title, source_page_number")
        .eq("analysis_id", analysisId)
        .eq("user_id", userId)
        .limit(500),
      admin
        .from("document_chunks")
        .select("id, page_number, chunk_text")
        .eq("analysis_id", analysisId)
        .eq("user_id", userId)
        .limit(120),
    ]);

    if (sectionsRes.error || pagesRes.error || glossaryRes.error || visualsRes.error || chunksRes.error) {
      const err =
        sectionsRes.error?.message ||
        pagesRes.error?.message ||
        glossaryRes.error?.message ||
        visualsRes.error?.message ||
        chunksRes.error?.message ||
        "data_load_failed";
      console.error(`${LOG} auto_generation_failed error=${err.slice(0, 240)}`);
      return { ok: false, generated: false, error: err.slice(0, 200) };
    }

    const result = await generateAndPersistMindMap(
      {
        supabase: admin,
        userId,
        documentId: docId,
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

    const n = result.nodes.length;
    const ed = result.edges.length;
    if (result.gemini_error) {
      console.warn(
        `${LOG} auto_generation_gemini_note document_id=${docId} gemini_error=${result.gemini_error.slice(0, 160)}`,
      );
    }
    console.info(`${LOG} auto_generation_completed document_id=${docId} nodes=${n} edges=${ed}`);
    return { ok: true, generated: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${LOG} auto_generation_failed error=${msg.slice(0, 400)}`);
    return { ok: false, generated: false, error: msg.slice(0, 200) };
  }
}
