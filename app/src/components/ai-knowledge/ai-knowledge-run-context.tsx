"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CustomPrompt, LibraryPrompt } from "@/types/prompt";
import { PromptRunDialog } from "@/components/ai-knowledge/PromptRunDialog";

type AnyPrompt = LibraryPrompt | CustomPrompt;

export type OpenRunOptions = {
  /** Pre-fill variable fields (e.g. re-run from Activity log). */
  initialVariables?: Record<string, string>;
};

type AiKnowledgeRunContextValue = {
  openRun: (prompt: AnyPrompt, options?: OpenRunOptions) => void;
};

const AiKnowledgeRunContext = createContext<AiKnowledgeRunContextValue | null>(
  null,
);

export function useAiKnowledgeRun(): AiKnowledgeRunContextValue {
  const ctx = useContext(AiKnowledgeRunContext);
  if (!ctx) {
    throw new Error("useAiKnowledgeRun must be used within AiKnowledgeRunProvider");
  }
  return ctx;
}

/**
 * Section-scoped provider for the “Run with Gemini” dialog. Mount once under
 * `ai-knowledge/layout.tsx` so cards, the detail drawer, and deep-linked pages
 * can all call `openRun(prompt)` without prop drilling.
 */
export function AiKnowledgeRunProvider({ children }: { children: ReactNode }) {
  const [runPrompt, setRunPrompt] = useState<AnyPrompt | null>(null);
  const [runOptions, setRunOptions] = useState<OpenRunOptions>({});

  const openRun = useCallback((prompt: AnyPrompt, options?: OpenRunOptions) => {
    setRunPrompt(prompt);
    setRunOptions(options ?? {});
  }, []);

  const closeRun = useCallback(() => {
    setRunPrompt(null);
    setRunOptions({});
  }, []);

  const value = useMemo(() => ({ openRun }), [openRun]);

  return (
    <AiKnowledgeRunContext.Provider value={value}>
      {children}
      <PromptRunDialog
        prompt={runPrompt}
        initialVariables={runOptions.initialVariables}
        onClose={closeRun}
      />
    </AiKnowledgeRunContext.Provider>
  );
}
