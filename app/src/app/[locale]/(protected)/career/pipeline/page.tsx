import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerPageUser } from "@/lib/auth/server-page-user";
import {
  DEFAULT_LOCALE_SLUG,
  normalizeLocaleSlug,
} from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { KanbanBoard } from "@/components/career-pipeline/KanbanBoard";

type PageProps = { params: Promise<{ locale: string }> };

export default async function CareerPipelinePage({ params }: PageProps) {
  const { locale } = await params;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;

  const supabase = await createServerSupabaseClient();
  const user = await getServerPageUser(supabase);
  if (!user) redirect(withLocalePrefix(slug, "/login"));

  return <KanbanBoard />;
}
