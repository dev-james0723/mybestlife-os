import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerPageUser } from "@/lib/auth/server-page-user";
import { getKnowledgeItems } from "@/lib/knowledge/queries";
import { getSmartCollections } from "@/lib/knowledge/queries";
import { KnowledgeLayout } from "@/components/knowledge/KnowledgeLayout";
import { DEFAULT_LOCALE_SLUG, normalizeLocaleSlug } from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";

type PageProps = { params: Promise<{ locale: string }> };

/** PDF → MinerU dispatch runs inline on finalize upload; allow cold Railway + callback to finish. */
export const maxDuration = 120;

export default async function KnowledgeBasePage({ params }: PageProps) {
  const { locale } = await params;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;

  const supabase = await createServerSupabaseClient();
  const user = await getServerPageUser(supabase);

  if (!user) redirect(withLocalePrefix(slug, "/login"));

  const [items, collections] = await Promise.all([
    getKnowledgeItems(user.id),
    getSmartCollections(user.id),
  ]);

  return (
    <KnowledgeLayout
      initialItems={items}
      initialCollections={collections}
      userId={user.id}
    />
  );
}
