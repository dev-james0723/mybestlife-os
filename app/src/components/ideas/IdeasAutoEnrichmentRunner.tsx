"use client";

import { useEffect, useRef } from "react";
import { fetchIdeaAutoEnrich } from "@/lib/ideas/fetchIdeaAutoEnrich";
import {
  ideaAiSummary,
  ideaRelatedResourceCount,
  previewIdeaTitle,
} from "@/lib/ideas/idea-helpers";
import { stripHtml } from "@/lib/utils/html";
import { useIdeasStore } from "@/stores/ideas-store";
import type { Idea } from "@/types/database";

function titleLooksRaw(idea: Idea): boolean {
  if (!idea.title?.trim()) return true;
  const plain = stripHtml(idea.content).replace(/\s+/g, " ").trim();
  if (!plain) return false;
  const preview = previewIdeaTitle(idea, 120);
  return preview === plain.slice(0, preview.length) || plain.startsWith(idea.title.trim());
}

function needsEnrichment(idea: Idea): boolean {
  if (idea.processing_step === "ai-enriched" || idea.processing_step === "ai-enriched-fallback") {
    return false;
  }
  return (
    titleLooksRaw(idea) ||
    !ideaAiSummary(idea) ||
    (idea.ai_tags?.length ?? 0) === 0 ||
    ideaRelatedResourceCount(idea) === 0
  );
}

export function IdeasAutoEnrichmentRunner({ items }: { items: Idea[] }) {
  const upsertIdea = useIdeasStore((s) => s.upsertIdea);
  const queuedRef = useRef(new Set<string>());
  const runningRef = useRef(false);

  useEffect(() => {
    if (runningRef.current) return;
    const queue = items
      .filter((idea) => needsEnrichment(idea) && !queuedRef.current.has(idea.id))
      .slice(0, 8);
    if (queue.length === 0) return;

    let cancelled = false;
    runningRef.current = true;
    for (const idea of queue) queuedRef.current.add(idea.id);

    void (async () => {
      for (const idea of queue) {
        if (cancelled) break;
        try {
          const enriched = await fetchIdeaAutoEnrich({
            ideaId: idea.id,
            includeVisual: false,
          });
          if (!cancelled) upsertIdea(enriched);
        } catch (err) {
          console.warn("[ideas] background auto-enrich failed:", err instanceof Error ? err.message : String(err));
        }
      }
    })().finally(() => {
      runningRef.current = false;
    });

    return () => {
      cancelled = true;
    };
  }, [items, upsertIdea]);

  return null;
}
