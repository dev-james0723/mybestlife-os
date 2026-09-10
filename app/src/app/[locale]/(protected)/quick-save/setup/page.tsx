import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings, Share2, Smartphone } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerPageUser } from "@/lib/auth/server-page-user";
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
  searchParams: Promise<{ reason?: string }>;
};

export const dynamic = "force-dynamic";

function messageForReason(reason: string | undefined) {
  if (reason === "disabled") {
    return "Quick Save is disabled for this account. Turn it on in Settings before sharing again.";
  }
  if (reason === "empty") {
    return "The Share Sheet did not send a link, text, image, or file that My Best Life OS can save.";
  }
  if (reason === "error") {
    return "My Best Life OS could not save that share. Check the file type or try again.";
  }
  return "Save a link or text in Knowledge Base. On supported devices, you can also share directly to the installed app.";
}

export default async function QuickSaveSetupPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { reason } = await searchParams;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;
  const supabase = await createServerSupabaseClient();
  const user = await getServerPageUser(supabase);

  if (!user) redirect(withLocalePrefix(slug, "/login"));

  return (
    <PageShell title="快捷儲存 / Quick Save" description={messageForReason(reason)}>
      <div className="max-w-2xl space-y-4">
        <div className={cn(osFrostedPanelClassName, osSheenClassName, "space-y-5 p-4 sm:p-5")}>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/72 text-lime-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/10 dark:bg-white/[0.06] dark:text-lime-200">
              <Share2 className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="font-heading text-base font-semibold leading-snug text-foreground">
                Share Sheet setup
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Direct sharing requires both an installed app and browser support. Installing alone does not guarantee a Share Sheet entry.
              </p>
            </div>
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Open My Best Life OS on your phone.</li>
            <li>Add it to Home Screen / Install app.</li>
            <li>
              Open Share in another app and look for My Best Life OS. If it is absent, copy the link or text and save it through Knowledge Base instead.
            </li>
          </ol>
          <p className="text-sm text-muted-foreground">Browser support varies. <a className="underline" href="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target" target="_blank" rel="noreferrer">Check supported browsers</a>.</p>
          <Button render={<Link href={withLocalePrefix(slug, "/knowledge-base")} />}>Open Knowledge Base to save manually</Button>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              render={<Link href={withLocalePrefix(slug, "/settings")} />}
              className={cn(osPrimaryControlClassName, osControlSizeClassName, "gap-2")}
            >
              <Settings className="h-4 w-4" />
              Open Settings
            </Button>
            <Button
              variant="outline"
              render={<Link href={withLocalePrefix(slug, "/dashboard")} />}
              className={cn(osGlassControlClassName, osControlSizeClassName, "gap-2")}
            >
              <Smartphone className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
