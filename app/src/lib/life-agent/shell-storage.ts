import type { LifeAgentMode, LifeAgentShellState } from "./types";
import { DEFAULT_LIFE_AGENT_CHARACTER_ID } from "./character-presets";

const STORAGE_KEY = "mylifeos-life-agent-shell-v1";

const listeners = new Set<() => void>();

export function subscribeLifeAgentShell(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function emitLifeAgentShellChange(): void {
  listeners.forEach((listener) => listener());
}

const DEFAULT_STATE: LifeAgentShellState = {
  characterId: DEFAULT_LIFE_AGENT_CHARACTER_ID,
  mode: "companion",
};

const MODES: LifeAgentMode[] = ["companion", "orchestrator", "operator", "mirror"];

function isMode(value: string): value is LifeAgentMode {
  return MODES.includes(value as LifeAgentMode);
}

/** Phase 1: local persistence until `life_agent_profiles` (Phase 2). */
export function readLifeAgentShellState(): LifeAgentShellState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<LifeAgentShellState>;
    const characterId =
      typeof parsed.characterId === "string" && parsed.characterId.length > 0
        ? parsed.characterId
        : DEFAULT_STATE.characterId;
    const mode =
      typeof parsed.mode === "string" && isMode(parsed.mode) ? parsed.mode : DEFAULT_STATE.mode;
    return { characterId, mode };
  } catch {
    return DEFAULT_STATE;
  }
}

export function writeLifeAgentShellState(state: LifeAgentShellState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    emitLifeAgentShellChange();
  } catch {
    // ignore quota / private mode
  }
}
