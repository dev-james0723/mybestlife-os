"use client";

import { Check, MessageCircle, Plus } from "lucide-react";
import { AdvisorPortrait } from "@/components/mind-council/AdvisorPortrait";
import { OSControl, OSPrimaryAction } from "@/components/ui/os-primitives";
import { advisorDisplayName } from "@/lib/mind-council/conversation-contract";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import type { MindSkill } from "@/lib/mind-council/types";
import styles from "./advisor-deck.module.css";

type AdvisorPlayingCardProps = {
  skill: MindSkill;
  ui: MindCouncilUiCopy;
  index: number;
  inCouncil: boolean;
  councilFull: boolean;
  onChat: () => void;
  onAddCouncil: () => void;
  onProfile: () => void;
};

/** Portrait-led cards are exclusive to the featured deck; the library stays compact. */
export function AdvisorPlayingCard({
  skill,
  ui,
  index,
  inCouncil,
  councilFull,
  onChat,
  onAddCouncil,
  onProfile,
}: AdvisorPlayingCardProps) {
  const name = advisorDisplayName(skill.lensTitle);
  const addDisabled = inCouncil || councilFull;

  return (
    <article className={styles.card} data-selected={inCouncil || undefined}>
      <button
        type="button"
        className={styles.profile}
        onClick={onProfile}
        aria-label={`${ui.profileTitle}: ${name}`}
      >
        <AdvisorPortrait
          skill={skill}
          className="absolute inset-0 h-full w-full"
          rounded="rounded-none"
          pixelSize={288}
          alt=""
        />
        <span className={styles.photoShade} aria-hidden="true" />
        <span className={styles.corner} aria-hidden="true">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span className={styles.suit}>♢</span>
        </span>
        <span className={styles.badge}>{ui.lensBadge}</span>
        <span className={styles.photoName}>{name}</span>
      </button>

      <div className={styles.body}>
        <div className={styles.categoryRow}>
          <span className={styles.category}>{ui.categoryTab[skill.category]}</span>
          <span className={styles.smallSuit} aria-hidden="true">♢</span>
        </div>
        <h3 className="sr-only">{skill.lensTitle}</h3>
        <p className={styles.subtitle}>{skill.lensSubtitle}</p>
        <div className={styles.actions}>
          <OSPrimaryAction
            type="button"
            osSize="compact"
            onClick={onChat}
            aria-label={`${ui.chatTitle}: ${name}`}
          >
            <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {ui.chatTitle}
          </OSPrimaryAction>
          <OSControl
            type="button"
            osSize="compact"
            onClick={onAddCouncil}
            disabled={addDisabled}
            aria-label={`${inCouncil ? ui.currentCouncilTitle : ui.addToCouncil}: ${name}`}
            title={!inCouncil && councilFull ? ui.councilCapHint : undefined}
          >
            {inCouncil ? (
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            {inCouncil ? ui.currentCouncilTitle : ui.addToCouncil}
          </OSControl>
        </div>
      </div>
    </article>
  );
}
