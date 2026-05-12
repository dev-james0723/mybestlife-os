import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getKnowledgeItemForUser } from "@/lib/knowledge/queries";
import {
  DocOracleWorkspace,
  type DocOracleAnalysis,
  type DocOracleGlossaryRow,
  type DocOraclePageRow,
  type DocOracleSectionRow,
  type DocOracleVisualRow,
} from "@/components/document-oracle/DocOracleWorkspace";
import { DEFAULT_LOCALE_SLUG, normalizeLocaleSlug, type LocaleUrlSlug } from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";

type PageProps = { params: Promise<{ locale: string; itemId: string }> };

function buildSuggestedQuestions(sections: DocOracleSectionRow[], glossary: DocOracleGlossaryRow[]): string[] {
  const out: string[] = [
    "What is this document mainly about?",
    "Summarize the key requirements.",
    "What are the important dates, fees, or action items?",
  ];
  for (const s of sections.slice(0, 5)) {
    out.push(`Explain the section “${s.title}”.`);
  }
  for (const g of glossary.slice(0, 4)) {
    out.push(`What does “${g.term}” mean in this document?`);
  }
  return out.slice(0, 12);
}

export default async function DocOraclePage({ params }: PageProps) {
  const { locale: rawLocale, itemId } = await params;
  const locale = (normalizeLocaleSlug(rawLocale) ?? DEFAULT_LOCALE_SLUG) as LocaleUrlSlug;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(withLocalePrefix(locale, "/login"));

  const item = await getKnowledgeItemForUser(itemId, user.id);
  if (!item) notFound();

  const { data: analysis } = await supabase
    .from("document_analyses")
    .select("id,document_title,summary,total_pages,parser,parser_version,status,document_type,language")
    .eq("document_id", itemId)
    .eq("user_id", user.id)
    .maybeSingle();

  const analysisRow = (analysis as DocOracleAnalysis | null) ?? null;

  const { data: pages } = await supabase
    .from("document_pages")
    .select("id,page_number,page_summary,keywords,has_visual_assets,markdown,rendered_image_path")
    .eq("document_id", itemId)
    .eq("user_id", user.id)
    .order("page_number", { ascending: true })
    .limit(240);

  const { data: sections } = await supabase
    .from("document_sections")
    .select("id,title,level,parent_id,page_start,page_end,summary,keywords,representative_pages")
    .eq("document_id", itemId)
    .eq("user_id", user.id)
    .order("page_start", { ascending: true, nullsFirst: false })
    .limit(400);

  const { data: glossary } = await supabase
    .from("document_glossary_terms")
    .select("id,term,definition,category,pages,related_terms")
    .eq("document_id", itemId)
    .eq("user_id", user.id)
    .limit(500);

  const { data: visuals } = await supabase
    .from("document_visual_assets")
    .select(
      "id,type,semantic_category,title,description,image_path,source_page_number,extracted_labels,retrieval_tags,related_terms,related_sections,confidence",
    )
    .eq("document_id", itemId)
    .eq("user_id", user.id)
    .limit(120);

  const analysisId = analysisRow?.id;
  let chunkCount = 0;
  if (analysisId) {
    const { count } = await supabase
      .from("document_chunks")
      .select("*", { count: "exact", head: true })
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id);
    chunkCount = count ?? 0;
  }

  const secRows = (sections as DocOracleSectionRow[] | null) ?? [];
  const glossRows = (glossary as DocOracleGlossaryRow[] | null) ?? [];
  const suggestedQuestions = buildSuggestedQuestions(secRows, glossRows);

  const showDebugLink = process.env.NODE_ENV === "development";

  return (
    <DocOracleWorkspace
      locale={locale}
      item={item}
      analysis={analysisRow}
      pages={(pages as DocOraclePageRow[] | null) ?? []}
      sections={secRows}
      glossary={glossRows}
      visuals={(visuals as DocOracleVisualRow[] | null) ?? []}
      chunkCount={chunkCount}
      suggestedQuestions={suggestedQuestions}
      showDebugLink={showDebugLink}
    />
  );
}
