"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import { profileInputFromCustomization } from "@/lib/life-agent/character-state";
import type { LifeAgentCharacterPreset } from "@/lib/life-agent/types";
import type { LifeAgentProfile } from "@/types/life-agent";
import { cn } from "@/lib/utils";

type TraitKey =
  | "warmth"
  | "directness"
  | "creativity"
  | "strategic_depth"
  | "execution_energy"
  | "emotional_gentleness";

const TRAIT_FIELDS: { key: TraitKey; labelKey: keyof LifeAgentUiCopy["toneTraitLabels"] }[] = [
  { key: "warmth", labelKey: "warmth" },
  { key: "directness", labelKey: "directness" },
  { key: "creativity", labelKey: "creativity" },
  { key: "strategic_depth", labelKey: "strategicDepth" },
  { key: "execution_energy", labelKey: "executionEnergy" },
  { key: "emotional_gentleness", labelKey: "emotionalGentleness" },
];

type CharacterCustomizerProps = {
  ui: LifeAgentUiCopy;
  character: LifeAgentCharacterPreset;
  profile: LifeAgentProfile | null | undefined;
  isSaving: boolean;
  onSave: (input: ReturnType<typeof profileInputFromCustomization>) => void;
  className?: string;
};

function traitsFromSources(
  character: LifeAgentCharacterPreset,
  profile: LifeAgentProfile | null | undefined,
) {
  return {
    custom_name: profile?.custom_name ?? "",
    warmth: profile?.warmth ?? character.warmth,
    directness: profile?.directness ?? character.directness,
    creativity: profile?.creativity ?? character.creativity,
    strategic_depth: profile?.strategic_depth ?? character.strategicDepth,
    execution_energy: profile?.execution_energy ?? character.executionEnergy,
    emotional_gentleness: profile?.emotional_gentleness ?? character.emotionalGentleness,
    visual_style: (profile?.visual_style as "soft" | "minimal" | "vivid" | null) ?? "soft",
  };
}

export function CharacterCustomizer({
  ui,
  character,
  profile,
  isSaving,
  onSave,
  className,
}: CharacterCustomizerProps) {
  const [traits, setTraits] = useState(() => traitsFromSources(character, profile));

  const setTrait = useCallback((key: TraitKey, value: number) => {
    setTraits((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(
      profileInputFromCustomization(character.id, {
        custom_name: traits.custom_name || null,
        warmth: traits.warmth,
        directness: traits.directness,
        creativity: traits.creativity,
        strategic_depth: traits.strategic_depth,
        execution_energy: traits.execution_energy,
        emotional_gentleness: traits.emotional_gentleness,
        visual_style: traits.visual_style,
      }),
    );
  }, [character.id, onSave, traits]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card/50 p-4 backdrop-blur-sm sm:p-5",
        className,
      )}
      aria-labelledby="character-customizer-heading"
    >
      <div className="space-y-1">
        <h2 id="character-customizer-heading" className="text-base font-semibold">
          {ui.characterCustomizeTitle}
        </h2>
        <p className="text-xs text-muted-foreground">{ui.characterCustomizeSubtitle}</p>
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="companion-custom-name" className="text-xs font-medium text-muted-foreground">
            {ui.characterCustomNameLabel}
          </label>
          <Input
            id="companion-custom-name"
            value={traits.custom_name}
            onChange={(e) => setTraits((p) => ({ ...p, custom_name: e.target.value }))}
            placeholder={ui.characterCustomNamePlaceholder}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {ui.characterVisualStyleLabel}
          </span>
          <div className="flex flex-wrap gap-2">
            {(["soft", "minimal", "vivid"] as const).map((style) => (
              <Button
                key={style}
                type="button"
                size="sm"
                variant={traits.visual_style === style ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setTraits((p) => ({ ...p, visual_style: style }))}
              >
                {ui.visualStyleOptions[style]}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TRAIT_FIELDS.map(({ key, labelKey }) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <label htmlFor={`trait-${key}`}>{ui.toneTraitLabels[labelKey]}</label>
                <span className="tabular-nums">{traits[key]}</span>
              </div>
              <input
                id={`trait-${key}`}
                type="range"
                min={0}
                max={100}
                value={traits[key]}
                onChange={(e) => setTrait(key, Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer accent-primary"
              />
            </div>
          ))}
        </div>

        <Button
          type="button"
          className="w-full rounded-xl sm:w-auto"
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? ui.characterSavingTraits : ui.characterSaveTraits}
        </Button>
      </div>
    </section>
  );
}
