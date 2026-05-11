"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarDays, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import { useLocalizedPath } from "@/hooks/use-locale-slug";

/**
 * Settings card: "Connect Google Calendar" stub.
 *
 * Google OAuth is wired at the top-level `/google-calendar` page
 * (existing) and the Daily Planner's sync flow. This card surfaces the
 * connect control in Settings for discoverability; clicking it
 * currently routes to the existing Google page rather than firing a
 * second OAuth flow.
 */
export function GoogleCalendarConnect() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getCalendarUiCopy(language), [language]);
  const googleCalendarHref = useLocalizedPath("/google-calendar");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
          <div>
            <CardTitle>{copy.googleCalendarConnect}</CardTitle>
            <CardDescription>{copy.googleCalendarComingSoon}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          render={<Link href={googleCalendarHref} />}
        >
          {copy.googleCalendarConnect}
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
