import type {
  CharacterAvatarState,
  CompanionArrivalState,
  ResolveAvatarStateInput,
} from "@/lib/life-agent/companion-presence-types";
import { CALM_ARRIVAL_STATES } from "@/lib/life-agent/companion-presence-types";
import type { LifeAgentCharacterPreset } from "@/lib/life-agent/types";
import type { LifeAgentMode } from "@/lib/life-agent/types";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentProfile } from "@/types/life-agent";

export function isCalmArrivalState(arrival: CompanionArrivalState | null): boolean {
  if (!arrival) return false;
  return CALM_ARRIVAL_STATES.includes(arrival);
}

export function resolveAvatarState(input: ResolveAvatarStateInput): CharacterAvatarState {
  if (input.celebrating) return "celebrating";
  if (input.isChatPending || input.isUploadBusy) return "thinking";
  if (input.isSending) return "listening";

  if (input.arrival === "anxious" || input.arrival === "heavy") return "concerned";
  if (input.arrival === "tired" || input.arrival === "quiet") return "protecting";

  switch (input.mode) {
    case "orchestrator":
      return "planning";
    case "operator":
      return "focused";
    case "mirror":
      return "reflecting";
    case "companion":
    default:
      return "listening";
  }
}

export function getAvatarStateLabel(
  ui: LifeAgentUiCopy,
  characterId: string,
  state: CharacterAvatarState,
  displayName: string,
): string {
  if (characterId === "sage" && (state === "thinking" || state === "reflecting" || state === "planning")) {
    return ui.avatarStateSagePatterns(displayName);
  }
  if (characterId === "nova" && (state === "focused" || state === "planning")) {
    return ui.avatarStateNovaAction(displayName);
  }
  if (characterId === "guardian" && (state === "protecting" || state === "concerned")) {
    return ui.avatarStateGuardianBoundaries(displayName);
  }
  if (characterId === "atlas" && state === "planning") {
    return ui.avatarStateAtlasOrganizing(displayName);
  }

  switch (state) {
    case "thinking":
      return ui.avatarStateThinking(displayName);
    case "planning":
      return ui.avatarStatePlanning(displayName);
    case "reflecting":
      return ui.avatarStateReflecting(displayName);
    case "protecting":
      return ui.avatarStateProtecting(displayName);
    case "celebrating":
      return ui.avatarStateCelebrating(displayName);
    case "focused":
      return ui.avatarStateFocused(displayName);
    case "concerned":
      return ui.avatarStateConcerned(displayName);
    case "listening":
    default:
      return ui.avatarStateListening(displayName);
  }
}

export function modeGlowClass(mode: LifeAgentMode): string {
  switch (mode) {
    case "companion":
      return "shadow-rose-400/25";
    case "orchestrator":
      return "shadow-indigo-400/25";
    case "operator":
      return "shadow-cyan-400/30";
    case "mirror":
      return "shadow-violet-400/25";
    default:
      return "shadow-primary/20";
  }
}

export function resolveDisplayCharacter(
  preset: LifeAgentCharacterPreset,
  profile: LifeAgentProfile | null | undefined,
): LifeAgentCharacterPreset & { displayName: string } {
  const displayName = profile?.custom_name?.trim() || preset.name;
  if (!profile) {
    return { ...preset, displayName };
  }
  return {
    ...preset,
    displayName,
    warmth: profile.warmth ?? preset.warmth,
    directness: profile.directness ?? preset.directness,
    creativity: profile.creativity ?? preset.creativity,
    strategicDepth: profile.strategic_depth ?? preset.strategicDepth,
    executionEnergy: profile.execution_energy ?? preset.executionEnergy,
    emotionalGentleness: profile.emotional_gentleness ?? preset.emotionalGentleness,
  };
}

export function profileInputFromCustomization(
  characterId: string,
  traits: {
    custom_name?: string | null;
    warmth: number;
    directness: number;
    creativity: number;
    strategic_depth: number;
    execution_energy: number;
    emotional_gentleness: number;
    visual_style?: string | null;
  },
) {
  return {
    character_id: characterId,
    custom_name: traits.custom_name?.trim() || null,
    warmth: traits.warmth,
    directness: traits.directness,
    creativity: traits.creativity,
    strategic_depth: traits.strategic_depth,
    execution_energy: traits.execution_energy,
    emotional_gentleness: traits.emotional_gentleness,
    visual_style: traits.visual_style ?? null,
  };
}
