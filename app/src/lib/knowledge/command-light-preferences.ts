export const MIN_KNOWLEDGE_COMMAND_LIGHT_OPACITY = 0;
export const MAX_KNOWLEDGE_COMMAND_LIGHT_OPACITY = 100;
export const DEFAULT_KNOWLEDGE_COMMAND_LIGHT_OPACITY = 82;

export function normalizeKnowledgeCommandLightOpacity(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) return DEFAULT_KNOWLEDGE_COMMAND_LIGHT_OPACITY;

  return Math.min(
    MAX_KNOWLEDGE_COMMAND_LIGHT_OPACITY,
    Math.max(MIN_KNOWLEDGE_COMMAND_LIGHT_OPACITY, Math.round(numeric)),
  );
}

export function knowledgeCommandLightOpacityToCssValue(value: unknown): string {
  return (normalizeKnowledgeCommandLightOpacity(value) / 100).toFixed(2);
}
