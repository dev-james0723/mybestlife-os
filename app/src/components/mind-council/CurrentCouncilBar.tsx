"use client";

import type { MindSkill } from "@/lib/mind-council/types";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { AdvisorPortrait } from "@/components/mind-council/AdvisorPortrait";

type CurrentCouncilBarProps = {
  ui: MindCouncilUiCopy;
  members: MindSkill[];
  onRemove: (skillId: string) => void;
};

export function CurrentCouncilBar({ ui, members, onRemove }: CurrentCouncilBarProps) {
  return (
    <section className="rounded-3xl border border-dashed border-primary/25 bg-primary/5 p-4 backdrop-blur-md sm:p-5">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{ui.currentCouncilTitle}</h2>
          <p className="text-xs text-muted-foreground sm:text-sm">{ui.currentCouncilSubtitle}</p>
        </div>
        <p className="text-[11px] text-muted-foreground">{ui.councilCapHint}</p>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ui.recommendTopicHint}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
              <div
                key={m.skillId}
                className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/70 py-1 pl-1 pr-2 text-xs shadow-sm"
              >
                <AdvisorPortrait skill={m} className="h-8 w-8" pixelSize={32} />
                <span className="max-w-[140px] truncate font-medium">{m.lensTitle}</span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 rounded-lg"
                  onClick={() => onRemove(m.skillId)}
                  aria-label={ui.removeAdvisor}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
          ))}
        </div>
      )}
    </section>
  );
}
