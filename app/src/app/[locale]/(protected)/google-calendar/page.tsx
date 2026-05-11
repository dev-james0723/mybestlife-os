"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { getSettingsUiCopy } from "@/lib/i18n/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function GoogleCalendarPage() {
  const locale = useAppStore((s) => s.language);
  const dailyPlannerHref = useLocalizedPath("/daily-planner");
  const settingsHref = useLocalizedPath("/settings");
  const ui = getSettingsUiCopy(locale);
  const { startGoogleCalendarAccessFlow } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleConnect = async () => {
    setBusy(true);
    try {
      await startGoogleCalendarAccessFlow();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ui.googleCalendarConnectFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title={ui.googleCalendarTitle} description={ui.googleCalendarDescription}>
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
              <div>
                <CardTitle>{ui.googleCalendarTitle}</CardTitle>
                <CardDescription>{ui.googleCalendarPlannerBlurb}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleConnect()} disabled={busy}>
              {busy ? ui.googleCalendarConnecting : ui.googleCalendarConnect}
            </Button>
            <Link
              href={dailyPlannerHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "inline-flex no-underline",
              )}
            >
              {ui.googleCalendarGoPlanner}
            </Link>
            <Link
              href={settingsHref}
              className={cn(
                buttonVariants({ variant: "ghost", size: "default" }),
                "inline-flex no-underline",
              )}
            >
              {ui.pageTitle}
            </Link>
          </CardContent>
        </Card>

        <div className="space-y-2 rounded-lg border bg-muted/25 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{ui.googleCalendarSetupTitle}</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>{ui.googleCalendarSetupStepSupabase}</li>
            <li>{ui.googleCalendarSetupStepGoogleCloud}</li>
            <li>{ui.googleCalendarSetupStepConsent}</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
