"use client";

import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getPresetSkillById } from "@/lib/mind-council/preset-skills";
import { AdvisorPortrait } from "@/components/mind-council/AdvisorPortrait";
import {
  OSActionRow,
  OSControl,
  OSFrostedPanel,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";

type AdvisorRecommendationPanelProps = {
  ui: MindCouncilUiCopy;
  recommendedIds: string[];
  rationale: string;
  loading: boolean;
  onRefresh: () => void;
  onAddAll: () => void;
};

export function AdvisorRecommendationPanel({
  ui,
  recommendedIds,
  rationale,
  loading,
  onRefresh,
  onAddAll,
}: AdvisorRecommendationPanelProps) {
  return (
    <OSFrostedPanel className="p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{ui.recommendPanelTitle}</h2>
          <p className="text-sm text-muted-foreground">{ui.recommendPanelSubtitle}</p>
        </div>
        <OSActionRow>
          <OSControl type="button" osSize="compact" onClick={onRefresh} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {ui.recommending}
              </>
            ) : (
              ui.recommendCta
            )}
          </OSControl>
          <OSPrimaryAction type="button" osSize="compact" onClick={onAddAll} disabled={!recommendedIds.length}>
            {ui.recommendAddSelected}
          </OSPrimaryAction>
        </OSActionRow>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{rationale}</p>
      <p className="mt-2 text-xs text-muted-foreground/80">{ui.recommendTopicHint}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {recommendedIds.map((id) => {
          const s = getPresetSkillById(id);
          if (!s) return null;
          return (
            <Badge
              key={id}
              variant="secondary"
              className="max-w-full gap-1.5 truncate rounded-lg py-1 pl-1 pr-3 text-xs font-normal"
            >
              <AdvisorPortrait skill={s} className="h-6 w-6" pixelSize={24} rounded="rounded-md" />
              <span className="truncate">{s.lensTitle}</span>
            </Badge>
          );
        })}
      </div>
    </OSFrostedPanel>
  );
}
