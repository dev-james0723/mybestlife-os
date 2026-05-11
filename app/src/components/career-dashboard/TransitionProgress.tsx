"use client";

import { useMemo } from "react";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useCareerProfile } from "@/hooks/use-career-profile";
import { useCareerOpportunities } from "@/hooks/use-career-opportunities";
import { computeProfileCompleteness } from "@/lib/repositories/career-profile";
import {
  countActiveApplications,
  countOffers,
  deriveTransitionProgress,
} from "@/lib/dashboard/aggregators";

export function TransitionProgressWidget() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).dashboard;
  const localeSlug = useLocaleSlug();

  const profileQ = useCareerProfile();
  const oppsQ = useCareerOpportunities();

  const { progressPct, topGoal, profileCompletePct } = useMemo(() => {
    const opps = oppsQ.data ?? [];
    const profileCompletePct = computeProfileCompleteness(profileQ.data);
    const progressPct = deriveTransitionProgress({
      manualProgress: profileQ.data?.transition_progress ?? null,
      activeApps: countActiveApplications(opps),
      offers: countOffers(opps),
      profileCompletenessPct: profileCompletePct,
    });
    const topGoal =
      profileQ.data?.transition_goal ??
      profileQ.data?.twelve_month_goals ??
      profileQ.data?.career_goals ??
      null;
    return { progressPct, topGoal, profileCompletePct };
  }, [oppsQ.data, profileQ.data]);

  const profileHref = withLocalePrefix(localeSlug, "/career/profile");

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {copy.sections.today}
      </h2>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-sky-400/20 text-emerald-600 dark:text-emerald-300"
          aria-hidden
        >
          <Target className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {copy.today.transitionProgress}
            </span>
            <span className="text-2xl font-bold tabular-nums">
              {progressPct}%
            </span>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-background/50 p-3">
          <dt className="text-[11px] font-medium uppercase text-muted-foreground">
            {copy.today.topGoal}
          </dt>
          <dd className="mt-1 line-clamp-2 text-sm">
            {topGoal ?? (
              <span className="italic text-muted-foreground">
                {copy.today.notSetYet}
              </span>
            )}
          </dd>
        </div>
        <div className="rounded-lg border bg-background/50 p-3">
          <dt className="text-[11px] font-medium uppercase text-muted-foreground">
            {copy.today.transitionCta}
          </dt>
          <dd className="mt-1">
            <Button variant="outline" size="sm" render={<Link href={profileHref} />}>
              {profileCompletePct < 100
                ? copy.today.profileCta
                : copy.today.transitionCta}
            </Button>
            {profileCompletePct < 100 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {copy.today.profileIncomplete(profileCompletePct)}
              </p>
            ) : null}
          </dd>
        </div>
      </dl>
    </section>
  );
}
