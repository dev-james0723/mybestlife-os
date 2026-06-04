import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerPageUser } from "@/lib/auth/server-page-user";
import { DEFAULT_LOCALE_SLUG, normalizeLocaleSlug } from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { listIdeasForAuthenticatedUser } from "@/lib/ideas/server-queries";
import { IdeasLayout } from "@/components/ideas/IdeasLayout";

type PageProps = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export default async function IdeasPage({ params }: PageProps) {
  const { locale } = await params;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;

  const supabase = await createServerSupabaseClient();
  const user = await getServerPageUser(supabase);

  if (!user) redirect(withLocalePrefix(slug, "/login"));

  let initialIdeas: Awaited<ReturnType<typeof listIdeasForAuthenticatedUser>> = [];
  try {
    initialIdeas = await listIdeasForAuthenticatedUser();
  } catch (err) {
    console.error("[ideas] Failed to load ideas for page:", err);
  }

  return <IdeasLayout initialIdeas={initialIdeas} />;
}
