"use client";

import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getPresetSkillById } from "@/lib/mind-council/preset-skills";

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
    <section className="rounded-3xl border border-border/60 bg-card/40 p-5 shadow-sm backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{ui.recommendPanelTitle}</h2>
          <p className="text-sm text-muted-foreground">{ui.recommendPanelSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={onRefresh} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                {ui.recommending}
              </>
            ) : (
              ui.recommendCta
            )}
          </Button>
          <Button type="button" size="sm" className="rounded-xl" onClick={onAddAll} disabled={!recommendedIds.length}>
            {ui.recommendAddSelected}
          </Button>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{rationale}</p>
      <p className="mt-2 text-xs text-muted-foreground/80">{ui.recommendTopicHint}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {recommendedIds.map((id) => {
          const s = getPresetSkillById(id);
          if (!s) return null;
          return (
            <Badge key={id} variant="secondary" className="max-w-full truncate rounded-lg px-3 py-1 text-xs font-normal">
              {s.lensTitle}
            </Badge>
          );
        })}
      </div>
    </section>
  );
}
