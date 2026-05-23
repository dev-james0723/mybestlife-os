"use client";

import type { MindSkill } from "@/lib/mind-council/types";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { SkillCard } from "@/components/mind-council/SkillCard";

type ReadySkillsSectionProps = {
  ui: MindCouncilUiCopy;
  skills: MindSkill[];
  councilIds: string[];
  councilFull: boolean;
  onChat: (skill: MindSkill) => void;
  onAddCouncil: (skill: MindSkill) => void;
  onProfile: (skill: MindSkill) => void;
};

export function ReadySkillsSection({
  ui,
  skills,
  councilIds,
  councilFull,
  onChat,
  onAddCouncil,
  onProfile,
}: ReadySkillsSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{ui.readyTitle}</h2>
        <p className="text-sm text-muted-foreground">{ui.readySubtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {skills.map((skill) => (
          <SkillCard
            key={skill.skillId}
            skill={skill}
            ui={ui}
            onChat={() => onChat(skill)}
            onAddCouncil={() => onAddCouncil(skill)}
            onProfile={() => onProfile(skill)}
            inCouncil={councilIds.includes(skill.skillId)}
            councilFull={councilFull}
          />
        ))}
      </div>
    </section>
  );
}
