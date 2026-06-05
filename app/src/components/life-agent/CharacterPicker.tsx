"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentCharacterPreset } from "@/lib/life-agent/types";
import { CharacterAvatar } from "@/components/life-agent/CharacterAvatar";

type CharacterPickerProps = {
  ui: LifeAgentUiCopy;
  characters: LifeAgentCharacterPreset[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const TRAIT_KEYS = [
  "warmth",
  "directness",
  "creativity",
  "strategicDepth",
  "executionEnergy",
  "emotionalGentleness",
] as const;

function ToneBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-primary/70 transition-[width] duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function CharacterPicker({ ui, characters, selectedId, onSelect }: CharacterPickerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="space-y-4" aria-labelledby="life-agent-character-heading">
      <div className="space-y-1">
        <h2 id="life-agent-character-heading" className="text-lg font-semibold tracking-tight">
          {ui.characterSectionTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{ui.characterSectionSubtitle}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {characters.map((character, index) => {
          const selected = character.id === selectedId;
          return (
            <motion.button
              key={character.id}
              type="button"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? REDUCED_MOTION_FADE
                  : { delay: index * 0.05, duration: 0.35, ease: EASE_OUT_EXPO }
              }
              whileHover={reduceMotion ? undefined : { y: -2 }}
              onClick={() => onSelect(character.id)}
              className={cn(
                "group relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-shadow",
                "bg-card/60 backdrop-blur-md",
                selected
                  ? "border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                  : "border-border/60 hover:border-border hover:shadow-md",
              )}
            >
              {selected && !reduceMotion && (
                <motion.span
                  layoutId="life-agent-character-glow"
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/5"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <div className="relative flex items-start gap-3">
                <CharacterAvatar character={character} size="md" selected={selected} />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-semibold leading-tight">{character.name}</p>
                  <p className="text-xs font-medium text-primary/90">{character.archetype}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{character.tagline}</p>
                </div>
              </div>
              <div className="relative grid grid-cols-2 gap-2">
                {TRAIT_KEYS.map((key) => (
                  <ToneBar
                    key={key}
                    label={ui.toneTraitLabels[key]}
                    value={character[key]}
                  />
                ))}
              </div>
              <p className="relative text-xs italic text-muted-foreground line-clamp-2">
                &ldquo;{character.sampleGreeting}&rdquo;
              </p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
