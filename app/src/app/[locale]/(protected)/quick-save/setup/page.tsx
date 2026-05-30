import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings, Share2, Smartphone } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE_SLUG, normalizeLocaleSlug } from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  return "Install the app on your phone, then use the native Share Sheet to save into My Best Life OS.";
}

export default async function QuickSaveSetupPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { reason } = await searchParams;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(withLocalePrefix(slug, "/login"));

  return (
    <PageShell title="快捷儲存 / Quick Save" description={messageForReason(reason)}>
      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Share Sheet setup</CardTitle>
                <CardDescription>
                  The OS share target appears only after the PWA is installed.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Open My Best Life OS on your phone.</li>
              <li>Add it to Home Screen / Install app.</li>
              <li>
                Use Share → My Best Life OS from apps like X, Instagram, Facebook,
                Safari, Chrome, etc.
              </li>
            </ol>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button render={<Link href={withLocalePrefix(slug, "/settings")} />} className="gap-2">
                <Settings className="h-4 w-4" />
                Open Settings
              </Button>
              <Button
                variant="outline"
                render={<Link href={withLocalePrefix(slug, "/dashboard")} />}
                className="gap-2"
              >
                <Smartphone className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
