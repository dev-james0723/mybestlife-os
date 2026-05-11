"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";

interface ConstellationEmptyStateProps {
  /** "empty" = user has no knowledge yet; "no-results" = filters too strict. */
  variant: "empty" | "no-results" | "local-no-selection" | "load-failed";
}

export function ConstellationEmptyState({ variant }: ConstellationEmptyStateProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const c = ui.constellation;
  const openAddModal = useKnowledgeStore((s) => s.openAddModal);
  const resetFilters = useKnowledgeStore((s) => s.resetConstellationFilters);

  const copy = (() => {
    switch (variant) {
      case "no-results":
        return { title: c.noResultsTitle, description: c.noResultsDescription };
      case "local-no-selection":
        return {
          title: c.localNoSelectionTitle,
          description: c.localNoSelectionDescription,
        };
      case "load-failed":
        return { title: c.loadFailed, description: "" };
      default:
        return { title: c.emptyTitle, description: c.emptyDescription };
    }
  })();

  return (
    <div className="relative flex flex-1 items-center justify-center p-8">
      {/* Subtle radial glow behind the message — feels like a star at the center of the empty void */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at center, rgba(125, 211, 252, 0.10) 0%, transparent 55%)",
        }}
      />
      <div className="relative z-10 flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-inner backdrop-blur">
          <Sparkles className="h-5 w-5 text-cyan-300" />
        </div>
        <h3 className="text-base font-medium text-foreground">{copy.title}</h3>
        {copy.description && (
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        )}
        {variant === "empty" && (
          <Button
            type="button"
            size="sm"
            onClick={openAddModal}
            className="mt-2 h-9 gap-2 border-transparent bg-violet-600 text-white shadow-sm hover:bg-violet-700"
          >
            {ui.addKnowledge}
          </Button>
        )}
        {variant === "no-results" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={resetFilters}
          >
            {c.filtersResetAll}
          </Button>
        )}
      </div>
    </div>
  );
}
