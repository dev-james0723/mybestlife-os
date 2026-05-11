import type { UiTheme } from "@/types/database";

/** Stable ids for Bio Lab regulation tools (routes + analytics). */
export type BioLabToolId = "focus-sprint" | "mind-sweep" | "state-scan" | "system-reset";

export const BIO_LAB_TOOL_IDS: readonly BioLabToolId[] = [
  "focus-sprint",
  "mind-sweep",
  "state-scan",
  "system-reset",
] as const;

export function isBioLabToolId(value: string): value is BioLabToolId {
  return (BIO_LAB_TOOL_IDS as readonly string[]).includes(value);
}

/** Theme-specific surface copy for a tool (subtitle, tone). */
export type BioLabToolThemeSurface = {
  subtitle: string;
};

export type BioLabToolThemeSurfaces = Record<UiTheme, BioLabToolThemeSurface>;
