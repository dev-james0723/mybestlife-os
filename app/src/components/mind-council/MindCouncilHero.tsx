"use client";

import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Users } from "lucide-react";

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
  const chips = [
    { label: ui.chipShipProduct, text: "Help me ship a focused MVP this month." },
    { label: ui.chipInvestLongTerm, text: "Long-term investing mindset for a volatile market." },
    { label: ui.chipInnerCalm, text: "Calm perspective when I feel overwhelmed and scattered." },
    { label: ui.chipScienceTruth, text: "Scientific thinking about a hypothesis I am testing at work." },
    { label: ui.chipAthleteDiscipline, text: "Athlete-level discipline for my daily deep work block." },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/80 to-card/40 p-6 shadow-lg backdrop-blur-xl sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {ui.disclaimerShort}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{ui.heroTitle}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{ui.heroSubtitle}</p>
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ui.heroPlaceholder}
          className="h-12 rounded-2xl border-border/70 bg-background/70 text-base backdrop-blur-md"
        />
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <Button
              key={c.label}
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full border border-border/50 bg-background/50 backdrop-blur-md"
              onClick={() => {
                onChange(c.text);
                onChip(c.text);
              }}
            >
              {c.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="rounded-2xl"
            variant="default"
            onClick={onRecommend}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {ui.recommendAdvisors}
          </Button>
          <Button type="button" variant="outline" className="rounded-2xl" onClick={onAskCouncil}>
            <Users className="mr-2 h-4 w-4" />
            {ui.askTheCouncil}
          </Button>
        </div>
      </div>
    </section>
  );
}
