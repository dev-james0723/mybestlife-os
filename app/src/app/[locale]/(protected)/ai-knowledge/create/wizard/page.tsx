import { redirect } from "next/navigation";
import {
  DEFAULT_LOCALE_SLUG,
  normalizeLocaleSlug,
} from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";

type PageProps = { params: Promise<{ locale: string }> };

export default async function AiKnowledgeCreateWizardRedirect({
  params,
}: PageProps) {
  const { locale } = await params;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;
  redirect(withLocalePrefix(slug, "/ai-knowledge?create=wizard"));
}
