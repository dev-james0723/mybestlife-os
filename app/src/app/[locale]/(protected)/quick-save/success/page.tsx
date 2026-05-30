import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE_SLUG, normalizeLocaleSlug } from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
      <Card className="max-w-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            You can open it now or return to your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <Button render={<Link href={openHref} />}>Open item</Button>
          <Button
            variant="outline"
            render={<Link href={withLocalePrefix(slug, "/dashboard")} />}
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}
