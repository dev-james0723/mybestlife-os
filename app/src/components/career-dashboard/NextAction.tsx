"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarClock, ArrowRight } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useCareerOpportunities } from "@/hooks/use-career-opportunities";
import { upcomingOpportunities } from "@/lib/dashboard/aggregators";

function formatDate(d: string | null, locale: string): string {
  if (!d) return "";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

export function NextActionWidget() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).dashboard;
  const localeSlug = useLocaleSlug();

  const oppsQ = useCareerOpportunities();
  const upcoming = useMemo(
    () => upcomingOpportunities(oppsQ.data ?? []),
    [oppsQ.data],
  );

  const top = upcoming[0];
  const href = top
    ? withLocalePrefix(localeSlug, `/career/pipeline/${top.id}`)
    : withLocalePrefix(localeSlug, "/career/pipeline");

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.today.nextAction}
          </h2>
          {top ? (
            <div className="mt-2 flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400/20 to-rose-400/20 text-amber-600 dark:text-amber-300">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {top.role_title} — {top.company_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(top.next_action_date, language)}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {copy.today.noUpcoming}
            </p>
          )}
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          aria-label={copy.submenu.pipeline}
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
