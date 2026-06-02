import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE_SLUG, normalizeLocaleSlug } from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import {
  osControlSizeClassName,
  osFrostedPanelClassName,
  osGlassControlClassName,
  osPrimaryControlClassName,
  osSheenClassName,
} from "@/components/ui/os-glass";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ destination?: string; item?: string; idea?: string }>;
};

export const dynamic = "force-dynamic";

export default async function QuickSaveSuccessPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const search = await searchParams;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(withLocalePrefix(slug, "/login"));

  const destination = search.destination === "idea" ? "idea" : "knowledge";
  const id = destination === "idea" ? search.idea : search.item;
  const openHref =
    destination === "idea"
      ? withLocalePrefix(slug, `/ideas${id ? `?idea=${encodeURIComponent(id)}` : ""}`)
      : withLocalePrefix(slug, `/knowledge-base${id ? `?item=${encodeURIComponent(id)}` : ""}`);
  const title =
    destination === "idea" ? "Saved to Idea Capture" : "Saved to Knowledge Base";

  return (
    <PageShell title="Quick Save" description="Your shared content has been saved.">
      <div
        className={cn(
          osFrostedPanelClassName,
          osSheenClassName,
          "max-w-xl space-y-5 p-5 text-center sm:p-6",
        )}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/72 text-lime-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/10 dark:bg-white/[0.06] dark:text-lime-200">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-heading text-base font-semibold leading-snug text-foreground">
            {title}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            You can open it now or return to your dashboard.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            render={<Link href={openHref} />}
            className={cn(osPrimaryControlClassName, osControlSizeClassName)}
          >
            Open item
          </Button>
          <Button
            variant="outline"
            render={<Link href={withLocalePrefix(slug, "/dashboard")} />}
            className={cn(osGlassControlClassName, osControlSizeClassName)}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
