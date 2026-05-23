"use client";

import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { Loader2 } from "lucide-react";

type CouncilSynthesisPanelProps = {
  ui: MindCouncilUiCopy;
  text: string;
  loading?: boolean;
};

export function CouncilSynthesisPanel({ ui, text, loading }: CouncilSynthesisPanelProps) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4 shadow-inner backdrop-blur-md">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {ui.synthesisTitle}
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </h3>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</div>
    </section>
  );
}
