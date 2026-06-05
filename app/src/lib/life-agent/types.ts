/** Agent interaction mode (UI shell; orchestration in later phases). */
export type LifeAgentMode = "companion" | "orchestrator" | "operator" | "mirror";

/** 0–100 tone trait scores for character cards. */
export type LifeAgentToneTraits = {
  warmth: number;
  directness: number;
  creativity: number;
  strategicDepth: number;
  executionEnergy: number;
  emotionalGentleness: number;
};

export type LifeAgentCharacterPreset = {
  id: string;
  name: string;
  archetype: string;
  tagline: string;
  description: string;
} & LifeAgentToneTraits & {
  avatarGradient: string;
  systemToneHint: string;
  sampleGreeting: string;
};

export type LifeAgentShellState = {
  characterId: string;
  mode: LifeAgentMode;
};
