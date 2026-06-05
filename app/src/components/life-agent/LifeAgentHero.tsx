"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { CharacterAvatarState } from "@/lib/life-agent/companion-presence-types";
import type { LifeAgentCharacterPreset, LifeAgentMode } from "@/lib/life-agent/types";
import { CharacterAvatar } from "@/components/life-agent/CharacterAvatar";
import { cn } from "@/lib/utils";

type LifeAgentHeroProps = {
  ui: LifeAgentUiCopy;
  character: LifeAgentCharacterPreset & { displayName?: string };
  userDisplayName?: string | null;
  mode?: LifeAgentMode;
  avatarState?: CharacterAvatarState;
  calmMode?: boolean;
};

export function LifeAgentHero({
  ui,
  character,
  userDisplayName,
  mode = "companion",
  avatarState = "listening",
  calmMode = false,
}: LifeAgentHeroProps) {
  const reduceMotion = useReducedMotion();
  const firstName = userDisplayName?.trim().split(/\s+/)[0];
  const welcome =
    firstName && firstName.length > 0
      ? ui.heroWelcomeNamed(firstName)
      : ui.heroWelcome;

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? REDUCED_MOTION_FADE : { duration: 0.5, ease: EASE_OUT_EXPO }}
      className={cn(
        "relative overflow-hidden rounded-3xl border p-6 shadow-lg backdrop-blur-xl sm:p-8",
        calmMode
          ? "border-rose-200/40 bg-gradient-to-br from-rose-50/90 via-card/95 to-amber-50/40 dark:border-rose-900/30 dark:from-rose-950/40"
          : "border-border/60 bg-gradient-to-br from-primary/8 via-card/90 to-amber-500/5",
      )}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-rose-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
        <CharacterAvatar
          character={character}
          ui={ui}
          size="lg"
          selected
          state={avatarState}
          mode={mode}
          showStatus
        />
        <div className="min-w-0 flex-1 space-y-3">
          <Badge variant="secondary" className="rounded-full bg-background/60 text-xs font-normal">
            {ui.disclaimerShort}
          </Badge>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{welcome}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{ui.heroBody}</p>
          </div>
          <p className="text-sm italic text-muted-foreground/90">
            &ldquo;{character.sampleGreeting}&rdquo;
          </p>
          <p className="rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
            {ui.heroPhaseNote}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
