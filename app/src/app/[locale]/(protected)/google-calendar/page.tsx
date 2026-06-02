"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import {
  OSControl,
  OSFrostedPanel,
  OSPrimaryAction,
  OSSolidPanel,
} from "@/components/ui/os-primitives";
import { useAppStore } from "@/stores/app-store";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { getSettingsUiCopy } from "@/lib/i18n/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

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
        <OSFrostedPanel className="space-y-5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/72 text-lime-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/10 dark:bg-white/[0.06] dark:text-lime-200">
              <CalendarDays className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="font-heading text-base font-semibold leading-snug text-foreground">
                {ui.googleCalendarTitle}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {ui.googleCalendarPlannerBlurb}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
            <OSPrimaryAction
              type="button"
              className="w-full sm:w-fit"
              onClick={() => void handleConnect()}
              disabled={busy}
            >
              {busy ? ui.googleCalendarConnecting : ui.googleCalendarConnect}
            </OSPrimaryAction>
            <OSControl
              render={<Link href={dailyPlannerHref} />}
              className="w-full no-underline sm:w-fit"
            >
              {ui.googleCalendarGoPlanner}
            </OSControl>
            <OSControl
              render={<Link href={settingsHref} />}
              variant="ghost"
              className="w-full no-underline sm:w-fit"
            >
              {ui.pageTitle}
            </OSControl>
          </div>
        </OSFrostedPanel>

        <OSSolidPanel className="space-y-2 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{ui.googleCalendarSetupTitle}</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>{ui.googleCalendarSetupStepSupabase}</li>
            <li>{ui.googleCalendarSetupStepGoogleCloud}</li>
            <li>{ui.googleCalendarSetupStepConsent}</li>
          </ul>
        </OSSolidPanel>
      </div>
    </PageShell>
  );
}
