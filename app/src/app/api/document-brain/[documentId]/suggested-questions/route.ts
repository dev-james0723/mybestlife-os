import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchGeminiPlannerJsonText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { extractJsonObjectFromModelText } from "@/lib/document-brain/geminiJsonExtract";
import {
  buildCategorizedSuggestedQuestions,
  buildLegacyFallbackPrompts,
  parseSuggestedQuestionCategoriesPayload,
} from "@/lib/document-brain/suggested-questions";
import type { DocOracleAnalysis, DocOracleGlossaryRow, DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { DocOraclePageRow, DocOracleVisualRow } from "@/components/document-oracle/docOraclePageTypes";
import {
  getDocOracleFixtureData,
  isDocOracleFixtureEnabled,
  isDocOracleFixtureId,
} from "@/lib/document-oracle/docOracleFixture";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await ctx.params;
  if (!documentId) {
    return NextResponse.json({ error: "invalid_document" }, { status: 400 });
  }

  if (isDocOracleFixtureEnabled() && isDocOracleFixtureId(documentId)) {
    const fixture = getDocOracleFixtureData();
    return NextResponse.json({
      categories: fixture.suggestedQuestionCategories,
      source: "fixture" as const,
    });
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
    .select("id,document_title,summary,total_pages,parser,parser_version,status,document_type,language")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  const analysisRow = (analysis as DocOracleAnalysis | null) ?? null;

  const { data: pages } = await supabase
    .from("document_pages")
    .select(
      "id,page_number,page_label,page_type,raw_text,markdown,page_summary,interpreted_page_meaning,keywords,linked_terms,linked_sections,rendered_image_path,rendered_image_url,source_pdf_page_ref,has_visual_assets,suggested_questions",
    )
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .order("page_number", { ascending: true })
    .limit(120);

  const { data: sections } = await supabase
    .from("document_sections")
    .select("id,title,level,parent_id,page_start,page_end,summary,keywords,representative_pages")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .order("page_start", { ascending: true, nullsFirst: false })
    .limit(200);

  const { data: glossary } = await supabase
    .from("document_glossary_terms")
    .select("id,term,definition,category,pages,related_terms")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .limit(200);

  const { data: visuals } = await supabase
    .from("document_visual_assets")
    .select(
      "id,type,semantic_category,title,description,image_path,source_page_number,extracted_labels,retrieval_tags,related_terms,related_sections,confidence",
    )
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .limit(80);

  const secRows = (sections as DocOracleSectionRow[] | null) ?? [];
  const glossRows = (glossary as DocOracleGlossaryRow[] | null) ?? [];
  const pageRows = (pages as DocOraclePageRow[] | null) ?? [];
  const visualRows = (visuals as DocOracleVisualRow[] | null) ?? [];

  const fallbackPrompts = buildLegacyFallbackPrompts(secRows, glossRows);
  const deterministic = buildCategorizedSuggestedQuestions({
    analysis: analysisRow,
    sections: secRows,
    pages: pageRows,
    glossary: glossRows,
    visuals: visualRows,
    fallbackPrompts,
  });

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ categories: deterministic, source: "deterministic" as const });
  }

  const sectionBrief = secRows.slice(0, 24).map((s) => ({
    title: s.title,
    page_start: s.page_start,
    page_end: s.page_end,
    summary: s.summary ? String(s.summary).slice(0, 400) : null,
  }));
  const glossBrief = glossRows.slice(0, 30).map((g) => ({
    term: g.term,
    definition: g.definition ? String(g.definition).slice(0, 320) : null,
    pages: g.pages,
  }));
  const pageBrief = pageRows.slice(0, 18).map((p) => ({
    page_number: p.page_number,
    summary: p.page_summary ? String(p.page_summary).slice(0, 280) : null,
    excerpt: (p.markdown || p.raw_text || "").slice(0, 900),
  }));
  const visualBrief = visualRows.slice(0, 20).map((v) => ({
    title: v.title,
    page: v.source_page_number,
    description: v.description ? String(v.description).slice(0, 200) : null,
  }));

  const userPayload = JSON.stringify(
    {
      document_title: analysisRow?.document_title ?? null,
      document_type: analysisRow?.document_type ?? null,
      language: analysisRow?.language ?? null,
      summary: analysisRow?.summary ? String(analysisRow.summary).slice(0, 3500) : null,
      sections: sectionBrief,
      glossary: glossBrief,
      pages: pageBrief,
      visuals: visualBrief,
    },
    null,
    0,
  );

  const systemInstruction = `You are Doc Oracle. Output ONLY valid JSON (no markdown) with this exact shape:
{"categories":[{"id":"string_slug","label":"string","description":"optional string","tone":"lime|amber|blue|violet|teal|rose|neutral","icon":"optional lucide-style name like sparkles|layers|book-open|calendar|image|alert-circle|list-check|arrow-right-circle|message-circle","questions":[{"id":"string","question":"string","rationale":"optional","sourcePages":[optional positive integers],"sourceSections":["optional strings"]}]}]}

Rules:
- Generate 3 to 7 categories based ONLY on the provided document JSON. Do not invent unrelated themes.
- 2 to 4 questions per category. Questions must be practical for a reader of this specific document.
- Prefer Traditional Chinese (繁體中文) for labels and questions when language indicates zh-TW / Traditional Chinese; otherwise use English.
- Do not fabricate page numbers: include sourcePages only when reasonably inferable from the payload (section page ranges, page summaries, glossary pages).
- Tones must be one of the allowed literals; vary tones across categories.
- Keep each question under 160 characters.`;

  try {
    const { text } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction,
      userText: `Document context JSON:\n${userPayload}\n\nReturn JSON only.`,
    });
    const extracted = extractJsonObjectFromModelText(text);
    const parsedRoot = JSON.parse(extracted) as unknown;
    const cats = parseSuggestedQuestionCategoriesPayload(parsedRoot);
    if (cats.length >= 2) {
      return NextResponse.json({ categories: cats, source: "gemini" as const });
    }
  } catch {
    /* fall through */
  }

  return NextResponse.json({ categories: deterministic, source: "deterministic" as const });
}
