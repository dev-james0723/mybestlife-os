"use client";

import type { MindSkill } from "@/lib/mind-council/types";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageCircle, Plus } from "lucide-react";
import { AdvisorPortrait } from "@/components/mind-council/AdvisorPortrait";
import { OSControl, OSFrostedPanel, OSPrimaryAction } from "@/components/ui/os-primitives";

type SkillCardProps = {
  skill: MindSkill;
  ui: MindCouncilUiCopy;
  onChat: () => void;
  onAddCouncil: () => void;
  onProfile: () => void;
  inCouncil: boolean;
  councilFull: boolean;
  compact?: boolean;
};

export function SkillCard({
  skill,
  ui,
  onChat,
  onAddCouncil,
  onProfile,
  inCouncil,
  councilFull,
  compact,
}: SkillCardProps) {
  return (
    <OSFrostedPanel
      className={cn(
        "group flex flex-col p-4 transition hover:border-primary/25 hover:bg-card/70",
        compact && "p-3",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onProfile}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
          aria-label={skill.lensTitle}
        >
          <AdvisorPortrait skill={skill} className="h-14 w-14" pixelSize={56} />
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold leading-tight">{skill.lensTitle}</h3>
            <Badge variant="secondary" className="text-[10px] font-normal">
              {ui.lensBadge}
            </Badge>
          </div>
          <p className={cn("text-xs text-muted-foreground line-clamp-2", compact && "line-clamp-2")}>
            {skill.lensSubtitle}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <OSPrimaryAction type="button" osSize="compact" onClick={onChat}>
          <MessageCircle className="h-3.5 w-3.5" />
          {ui.chatTitle}
        </OSPrimaryAction>
        <OSControl
          type="button"
          osSize="compact"
          disabled={(!inCouncil && councilFull) || inCouncil}
          onClick={onAddCouncil}
        >
          <Plus className="h-3.5 w-3.5" />
          {inCouncil ? "✓" : ui.addToCouncil}
        </OSControl>
      </div>
    </OSFrostedPanel>
  );
}
