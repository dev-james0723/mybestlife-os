"use client";

import { useMemo, useState } from "react";
import type { MindSkill, MindSkillCategory } from "@/lib/mind-council/types";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { SkillCard } from "@/components/mind-council/SkillCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { OSEmptyState, OSStatusRail } from "@/components/ui/os-primitives";

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

  const categoryItems = useMemo(
    () =>
      ALL_CATS.map((c) => ({
        id: c,
        label: c === "all" ? ui.tabAll : ui.categoryTab[c],
      })),
    [ui],
  );

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
            className="h-10 rounded-xl border-border/70 bg-background/78 pl-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md"
          />
        </div>
      </div>
      <OSStatusRail
        items={categoryItems}
        value={tab}
        onValueChange={setTab}
        ariaLabel={ui.libraryTitle}
        allowReselect
      />
      {filtered.length === 0 ? (
        <OSEmptyState
          icon={Search}
          title={ui.noSearchResults}
          className="border-dashed py-8"
        />
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
