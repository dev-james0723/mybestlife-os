import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEFAULT_LOCALE_SLUG,
  normalizeLocaleSlug,
} from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { BundleDetailView } from "@/components/career-vault/bundles/BundleDetailView";

type PageProps = {
  params: Promise<{ locale: string; bundleId: string }>;
};

export default async function CareerVaultBundleDetailPage({
  params,
}: PageProps) {
  const { locale, bundleId } = await params;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(withLocalePrefix(slug, "/login"));

  return <BundleDetailView bundleId={bundleId} />;
}
