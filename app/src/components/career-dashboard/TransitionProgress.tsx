"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import {
  OSControl,
  OSFrostedPanel,
  OSSolidPanel,
} from "@/components/ui/os-primitives";
import { useCareerProfile } from "@/hooks/use-career-profile";
import { getProfileCompleteness } from "@/lib/repositories/career-profile";
import { getSetupProgress } from "@/lib/career-mirror/setup-progress";
import type { SetupAnswers } from "@/lib/career-mirror/careerSetupTypes";

export function TransitionProgressWidget() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).dashboard;
  const localeSlug = useLocaleSlug();

  const profileQ = useCareerProfile();
  const chinese = language.startsWith("zh");
  const { basic, questionnaire, materials, topGoal } = useMemo(() => {
    const profile = profileQ.data;
    return {
      basic: getProfileCompleteness(profile),
      questionnaire: getSetupProgress((profile?.setup_answers ?? {}) as SetupAnswers),
      materials: [profile?.primary_headshot_id, profile?.primary_bio_id, profile?.master_resume_id].filter(Boolean).length,
      topGoal: profile?.transition_goal || profile?.twelve_month_goals || profile?.career_goals || null,
    };
  }, [profileQ.data]);

  const profileHref = withLocalePrefix(localeSlug, "/career/profile");

  return (
    <OSFrostedPanel as="section" className="p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {copy.sections.today}
      </h2>
      {profileQ.isLoading ? <p role="status" className="mt-3 text-sm">{chinese ? "載入中…" : "Loading…"}</p> : profileQ.isError ? <div role="alert" className="mt-3"><p>{chinese ? "未能載入進度" : "Could not load your progress"}</p><OSControl onClick={() => void profileQ.refetch()}>{chinese ? "重試" : "Retry"}</OSControl></div> : <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {[
          { label: chinese ? "基本資料欄位" : "Profile fields", value: `${basic.filled}/${basic.total}` },
          { label: chinese ? "核心探索問題" : "Core questions answered", value: `${questionnaire.answered}/${questionnaire.total}` },
          { label: chinese ? "已選主要材料" : "Primary materials selected", value: `${materials}/3` },
        ].map((metric) => <div key={metric.label}><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{metric.value}</p></div>)}
      </div>}

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <OSSolidPanel className="p-3">
          <dt className="text-[11px] font-medium uppercase text-muted-foreground">
            {copy.today.topGoal}
          </dt>
          <dd className="mt-1 break-words text-sm">
            {topGoal ?? (
              <span className="italic text-muted-foreground">
                {copy.today.notSetYet}
              </span>
            )}
          </dd>
        </OSSolidPanel>
        <OSSolidPanel className="p-3">
          <dt className="text-[11px] font-medium uppercase text-muted-foreground">
            {copy.today.transitionCta}
          </dt>
          <dd className="mt-1">
            <OSControl osSize="compact" render={<Link href={profileHref} />}>
              {basic.percent < 100
                ? copy.today.profileCta
                : copy.today.transitionCta}
            </OSControl>
            {basic.percent < 100 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {copy.today.profileIncomplete(basic.percent)}
              </p>
            ) : null}
          </dd>
        </OSSolidPanel>
      </dl>
    </OSFrostedPanel>
  );
}
