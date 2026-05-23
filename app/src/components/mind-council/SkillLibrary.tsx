"use client";

import { useMemo, useState } from "react";
import type { MindSkill, MindSkillCategory } from "@/lib/mind-council/types";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { SkillCard } from "@/components/mind-council/SkillCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

const ALL_CATS: (MindSkillCategory | "all")[] = [
  "all",
  "builders",
  "investors",
  "artists",
  "athletes",
  "leaders",
  "scientists",
  "philosophy",
];

type SkillLibraryProps = {
  ui: MindCouncilUiCopy;
  skills: MindSkill[];
  councilIds: string[];
  councilFull: boolean;
  onChat: (skill: MindSkill) => void;
  onAddCouncil: (skill: MindSkill) => void;
  onProfile: (skill: MindSkill) => void;
};

export function SkillLibrary({
  ui,
  skills,
  councilIds,
  councilFull,
  onChat,
  onAddCouncil,
  onProfile,
}: SkillLibraryProps) {
  const [tab, setTab] = useState<(typeof ALL_CATS)[number]>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return skills.filter((s) => {
      if (tab !== "all" && s.category !== tab) return false;
      if (!needle) return true;
      const hay = `${s.lensTitle} ${s.lensSubtitle} ${s.category}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [skills, tab, q]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{ui.libraryTitle}</h2>
          <p className="text-sm text-muted-foreground">{ui.librarySubtitle}</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ui.searchPlaceholder}
            className="rounded-2xl pl-9"
          />
        </div>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as (typeof ALL_CATS)[number])}>
        <TabsList className="no-scrollbar flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto rounded-2xl bg-muted/40 p-1">
          {ALL_CATS.map((c) => (
            <TabsTrigger
              key={c}
              value={c}
              className="rounded-xl px-3 py-1.5 text-xs data-[state=active]:shadow-sm sm:text-sm"
            >
              {c === "all" ? ui.tabAll : ui.categoryTab[c]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{ui.noSearchResults}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((skill) => (
            <SkillCard
              key={skill.skillId}
              skill={skill}
              ui={ui}
              compact
              onChat={() => onChat(skill)}
              onAddCouncil={() => onAddCouncil(skill)}
              onProfile={() => onProfile(skill)}
              inCouncil={councilIds.includes(skill.skillId)}
              councilFull={councilFull}
            />
          ))}
        </div>
      )}
    </section>
  );
}
