"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { OSSolidPanel } from "@/components/ui/os-primitives";
import { useCareerOpportunities } from "@/hooks/use-career-opportunities";
import { useCareerProfile } from "@/hooks/use-career-profile";
import { skillsGap } from "@/lib/dashboard/aggregators";

export function SkillsGapWidget() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).dashboard.intelligence;

  const oppsQ = useCareerOpportunities();
  const profileQ = useCareerProfile();

  const gaps = useMemo(
    () => skillsGap(oppsQ.data ?? [], profileQ.data?.top_skills ?? [], 3),
    [oppsQ.data, profileQ.data?.top_skills],
  );

  return (
    <OSSolidPanel className="p-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-violet-500" aria-hidden />
        <span className="text-sm font-medium">
          {gaps.length === 0
            ? copy.noSkillsGap
            : copy.skillsGap(gaps.join(", "))}
        </span>
      </div>
    </OSSolidPanel>
  );
}
