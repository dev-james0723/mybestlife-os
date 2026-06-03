import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BrainView } from "@/components/brain/BrainView";
import {
  DEFAULT_LOCALE_SLUG,
  normalizeLocaleSlug,
} from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { osMapSurfaceClassName } from "@/components/ui/os-glass";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ locale: string }> };

/**
 * Life OS Brain — global knowledge graph that connects every feature in
 * the app (Goals, Habits, Quotes, Projects, …). Auth is enforced server-
 * side; the actual data fetch happens on the client via TanStack Query so
 * Realtime updates can flow into the canvas without a full page reload.
 *
 * Layout note: the wrapper here is intentionally bare. The page chrome
 * (title, subtitle, toolbar, canvas) lives entirely *inside* `BrainView`
 * so the graph viewport can occupy the full available height without
 * a redundant top header eating vertical space. Older builds wrapped
 * this in a small fixed `h-[calc(100vh-12rem)]` box; that capped the
 * graph at roughly two-thirds of the viewport even on 1440p displays.
 */
export default async function BrainPage({ params }: PageProps) {
  const { locale } = await params;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(withLocalePrefix(slug, "/login"));

  return (
    <div
      className={cn(
        osMapSurfaceClassName,
        "h-[calc(100dvh-5rem)] min-h-[560px] w-full sm:h-[calc(100dvh-6rem)]",
      )}
    >
      <BrainView userId={user.id} />
    </div>
  );
}
