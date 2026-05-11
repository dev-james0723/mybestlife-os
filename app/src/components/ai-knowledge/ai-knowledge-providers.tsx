"use client";

import type { ReactNode } from "react";
import { AiKnowledgeRunProvider } from "@/components/ai-knowledge/ai-knowledge-run-context";
import { PaletteShortcutListener } from "@/components/ai-knowledge/PaletteShortcutListener";

/** Client-side providers + listeners for the whole AI Knowledge section. */
export function AiKnowledgeProviders({ children }: { children: ReactNode }) {
  return (
    <AiKnowledgeRunProvider>
      <PaletteShortcutListener />
      {children}
    </AiKnowledgeRunProvider>
  );
}
