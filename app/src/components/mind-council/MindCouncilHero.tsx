"use client";

import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { useAppStore } from "@/stores/app-store";
import { Input } from "@/components/ui/input";
import { Sparkles, Users } from "lucide-react";
import {
  OSActionRow,
  OSControl,
  OSGlassPanel,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";

type MindCouncilHeroProps = {
  ui: MindCouncilUiCopy;
  value: string;
  onChange: (v: string) => void;
  onChip: (text: string) => void;
  onRecommend: () => void;
  onAskCouncil: () => void;
};

export function MindCouncilHero({
  ui,
  value,
  onChange,
  onChip,
  onRecommend,
  onAskCouncil,
}: MindCouncilHeroProps) {
  const chinese = useAppStore((s) => s.language).startsWith("zh");
  const chips = [
    { label: ui.chipShipProduct, text: "Help me ship a focused MVP this month." },
    { label: ui.chipInvestLongTerm, text: "Long-term investing mindset for a volatile market." },
    { label: ui.chipInnerCalm, text: "Calm perspective when I feel overwhelmed and scattered." },
    { label: ui.chipScienceTruth, text: "Scientific thinking about a hypothesis I am testing at work." },
    { label: ui.chipAthleteDiscipline, text: "Athlete-level discipline for my daily deep work block." },
  ];

  return (
    <OSGlassPanel className="p-6 sm:p-8">
      <div className="relative space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{ui.heroTitle}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{ui.heroSubtitle}</p>
        </div>
        <Input
          aria-label={ui.heroPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ui.heroPlaceholder}
          className="h-12 rounded-xl border-border/70 bg-background/78 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md"
        />
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <OSControl
              key={c.label}
              type="button"
              osSize="compact"
              onClick={() => {
                onChange(c.text);
                onChip(c.text);
              }}
            >
              {c.label}
            </OSControl>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{chinese ? "AI 會參考人物的公開思想模擬視角，並非本人回覆。送出提問會將問題及選定視角傳送至 AI 服務。" : "AI simulates perspectives inspired by public ideas; these are not replies from the people themselves. Asking sends your question and chosen perspectives to the AI service."}</p>
        <OSActionRow className="sm:justify-start">
          <OSPrimaryAction
            type="button"
            onClick={onRecommend}
          >
            <Sparkles className="h-4 w-4" />
            {ui.recommendAdvisors}
          </OSPrimaryAction>
          <OSControl type="button" onClick={onAskCouncil}>
            <Users className="h-4 w-4" />
            {ui.askTheCouncil}
          </OSControl>
        </OSActionRow>
      </div>
    </OSGlassPanel>
  );
}
