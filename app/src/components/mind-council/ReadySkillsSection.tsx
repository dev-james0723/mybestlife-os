"use client";

import { useId, type CSSProperties } from "react";
import type { MindSkill } from "@/lib/mind-council/types";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { AdvisorPlayingCard } from "@/components/mind-council/AdvisorPlayingCard";
import styles from "./advisor-deck.module.css";

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
  const titleId = useId();

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <div>
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">{ui.readyTitle}</h2>
        {/* Portraits replace abstract avatars, so do not show the legacy readySubtitle. */}
        <p className="text-sm text-muted-foreground">{ui.disclaimerShort}</p>
      </div>
      <div
        className={styles.rail}
        role="region"
        aria-labelledby={titleId}
        tabIndex={0}
      >
        <ul className={styles.deck}>
          {skills.map((skill, index) => (
            <li
              key={skill.skillId}
              className={styles.slot}
              style={{
                "--card-tilt": `${Math.max(-2.5, Math.min(2.5, index - (skills.length - 1) / 2))}deg`,
              } as CSSProperties}
            >
              <AdvisorPlayingCard
                skill={skill}
                ui={ui}
                index={index}
                onChat={() => onChat(skill)}
                onAddCouncil={() => onAddCouncil(skill)}
                onProfile={() => onProfile(skill)}
                inCouncil={councilIds.includes(skill.skillId)}
                councilFull={councilFull}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
