import { getLifeAgentCharacterById } from "@/lib/life-agent/character-presets";
import type { UpsertLifeAgentProfileInput } from "@/types/life-agent";

/** Maps a character preset id to profile tone columns for persistence. */
export function profileInputFromCharacterId(characterId: string): UpsertLifeAgentProfileInput {
  const preset = getLifeAgentCharacterById(characterId);
  if (!preset) {
    return { character_id: characterId };
  }
  return {
    character_id: preset.id,
    warmth: preset.warmth,
    directness: preset.directness,
    creativity: preset.creativity,
    strategic_depth: preset.strategicDepth,
    execution_energy: preset.executionEnergy,
    emotional_gentleness: preset.emotionalGentleness,
  };
}
