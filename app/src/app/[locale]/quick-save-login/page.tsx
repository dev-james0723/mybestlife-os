import Link from "next/link";
import { DEFAULT_LOCALE_SLUG, normalizeLocaleSlug } from "@/lib/i18n/locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PageProps = { params: Promise<{ locale: string }> };

export default async function QuickSaveLoginPage({ params }: PageProps) {
  const { locale } = await params;
  const slug = normalizeLocaleSlug(locale) ?? DEFAULT_LOCALE_SLUG;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Log in to use Quick Save</CardTitle>
          <CardDescription>
            Open My Best Life OS, log in, then share the item again from your phone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href={withLocalePrefix(slug, "/login")} />} className="w-full">
            Log in
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
