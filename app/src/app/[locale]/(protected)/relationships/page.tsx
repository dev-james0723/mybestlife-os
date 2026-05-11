import { redirect } from "next/navigation";
import {
  DEFAULT_LOCALE_SLUG,
  normalizeLocaleSlug,
} from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";

/**
 * Legacy standalone Relationships page. Superseded by the Relationship hub
 * sub-tab at `/relationship?tab=relationship`. We keep this route as a
 * redirect so existing bookmarks/links don't 404.
 */
type PageProps = { params: Promise<{ locale: string }> };

export default async function RelationshipsRedirect({ params }: PageProps) {
  const { locale } = await params;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;
  redirect(withLocalePrefix(slug, "/relationship?tab=relationship"));
}
