"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  readLifeAgentShellState,
  subscribeLifeAgentShell,
  writeLifeAgentShellState,
} from "./shell-storage";
import type { LifeAgentMode, LifeAgentShellState } from "./types";
import { DEFAULT_LIFE_AGENT_CHARACTER_ID } from "./character-presets";

const SERVER_SNAPSHOT: LifeAgentShellState = {
  characterId: DEFAULT_LIFE_AGENT_CHARACTER_ID,
  mode: "companion",
};

export function useLifeAgentShell() {
  const state = useSyncExternalStore(
    subscribeLifeAgentShell,
    readLifeAgentShellState,
    () => SERVER_SNAPSHOT,
  );

  const setCharacterId = useCallback((characterId: string) => {
    const current = readLifeAgentShellState();
    writeLifeAgentShellState({ ...current, characterId });
  }, []);

  const setMode = useCallback((mode: LifeAgentMode) => {
    const current = readLifeAgentShellState();
    writeLifeAgentShellState({ ...current, mode });
  }, []);

  return { ...state, setCharacterId, setMode };
}
