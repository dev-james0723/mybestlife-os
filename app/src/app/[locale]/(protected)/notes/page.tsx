import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerPageUser } from "@/lib/auth/server-page-user";
import { DEFAULT_LOCALE_SLUG, normalizeLocaleSlug } from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { NotesLayout } from "@/components/notes/NotesLayout";

type PageProps = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export default async function NotesPage({ params }: PageProps) {
  const { locale } = await params;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;

  const supabase = await createServerSupabaseClient();
  const user = await getServerPageUser(supabase);

  if (!user) redirect(withLocalePrefix(slug, "/login"));

  return <NotesLayout />;
}
