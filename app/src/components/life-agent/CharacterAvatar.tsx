"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CharacterAvatarState } from "@/lib/life-agent/companion-presence-types";
import {
  getAvatarStateLabel,
  modeGlowClass,
} from "@/lib/life-agent/character-state";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentCharacterPreset } from "@/lib/life-agent/types";
import type { LifeAgentMode } from "@/lib/life-agent/types";
import { REDUCED_MOTION_FADE } from "@/lib/animation/easings";

type CharacterAvatarProps = {
  character: LifeAgentCharacterPreset & { displayName?: string };
  ui?: LifeAgentUiCopy;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  state?: CharacterAvatarState;
  mode?: LifeAgentMode;
  showStatus?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-base",
  lg: "h-20 w-20 text-lg",
};

export function CharacterAvatar({
  character,
  ui,
  size = "md",
  selected = false,
  state = "listening",
  mode = "companion",
  showStatus = false,
  className,
}: CharacterAvatarProps) {
  const reduceMotion = useReducedMotion();
  const initial = (character.displayName ?? character.name).charAt(0).toUpperCase();
  const displayName = character.displayName ?? character.name;

  const breathe =
    !reduceMotion && (state === "listening" || state === "protecting" || selected);

  const shimmer = !reduceMotion && state === "thinking";
  const celebrate = !reduceMotion && state === "celebrating";

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <motion.div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-inner",
          `bg-gradient-to-br ${character.avatarGradient}`,
          sizeClasses[size],
          selected && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background",
          modeGlowClass(mode),
        )}
        animate={
          breathe
            ? { scale: [1, 1.05, 1] }
            : celebrate
              ? { scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }
              : undefined
        }
        transition={
          breathe
            ? { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
            : celebrate
              ? { duration: 0.6, repeat: 2, ease: "easeOut" }
              : REDUCED_MOTION_FADE
        }
        aria-hidden
      >
        <span className="relative z-10 drop-shadow-sm">{initial}</span>
        {selected && (
          <span className="pointer-events-none absolute inset-0 rounded-full bg-white/10" />
        )}
        {shimmer && (
          <motion.span
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
            aria-hidden
          >
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
            />
          </motion.span>
        )}
        {celebrate && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-amber-200/90"
                style={{ top: `${20 + i * 15}%`, left: `${70 + i * 8}%` }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], y: [0, -6, -12] }}
                transition={{ delay: i * 0.12, duration: 0.8 }}
                aria-hidden
              />
            ))}
          </>
        )}
        {!reduceMotion && (
          <motion.span
            className={cn(
              "pointer-events-none absolute -inset-1 rounded-full opacity-40 blur-md",
              `bg-gradient-to-br ${character.avatarGradient}`,
            )}
            animate={{ opacity: selected ? [0.3, 0.55, 0.3] : 0.2 }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
        )}
      </motion.div>
      {showStatus && ui && (
        <p className="max-w-[12rem] text-center text-[11px] text-muted-foreground">
          {getAvatarStateLabel(ui, character.id, state, displayName)}
        </p>
      )}
    </div>
  );
}
