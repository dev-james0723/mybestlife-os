import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getKnowledgeItemForUser } from "@/lib/knowledge/queries";
import { DocOracleWorkspace } from "@/components/document-oracle/DocOracleWorkspace";
import { DEFAULT_LOCALE_SLUG, normalizeLocaleSlug, type LocaleUrlSlug } from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import type { DocOracleAnalysis } from "@/components/document-oracle/DocOracleWorkspace";

type PageProps = { params: Promise<{ locale: string; itemId: string }> };

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
    .select("id,document_title,summary,total_pages,parser,parser_version,status")
    .eq("document_id", itemId)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <DocOracleWorkspace
      locale={locale}
      item={item}
      analysis={(analysis as DocOracleAnalysis | null) ?? null}
    />
  );
}
