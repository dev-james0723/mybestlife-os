import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEFAULT_LOCALE_SLUG,
  normalizeLocaleSlug,
} from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { UseFlowView } from "@/components/ai-coach/use-flow/UseFlowView";

type PageProps = {
  params: Promise<{ locale: string; promptId: string }>;
};

export default async function CareerCoachUsePage({ params }: PageProps) {
  const { locale, promptId } = await params;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(withLocalePrefix(slug, "/login"));

  return <UseFlowView promptId={promptId} />;
}
