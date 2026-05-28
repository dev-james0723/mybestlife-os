"use client";

import { useEffect, useRef } from "react";
import { fetchIdeaAutoEnrich } from "@/lib/ideas/fetchIdeaAutoEnrich";
import {
  ideaAiSummary,
  ideaCardVisual,
  ideaRelatedResourceCount,
  previewIdeaTitle,
} from "@/lib/ideas/idea-helpers";
import { stripHtml } from "@/lib/utils/html";
import { useIdeasStore } from "@/stores/ideas-store";
import type { Idea } from "@/types/database";

/** Max ideas enriched per effect run, and the visual-generation sub-budget. */
const MAX_PER_BATCH = 6;
const MAX_VISUAL_PER_BATCH = 2;
/** Don't retry a failed visual for this long. */
const VISUAL_RETRY_MS = 10 * 60 * 1000;

function titleLooksRaw(idea: Idea): boolean {
  if (!idea.title?.trim()) return true;
  const plain = stripHtml(idea.content).replace(/\s+/g, " ").trim();
  if (!plain) return false;
  const preview = previewIdeaTitle(idea, 120);
  return preview === plain.slice(0, preview.length) || plain.startsWith(idea.title.trim());
}

function needsTextEnrichment(idea: Idea): boolean {
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

/** True when the idea has no card image yet (and isn't in a recent-failure backoff). */
function needsVisual(idea: Idea): boolean {
  const visual = ideaCardVisual(idea);
  if (visual?.imageUrl) return false;
  if (stripHtml(idea.content).trim().length < 8) return false;
  if (visual?.status === "failed") {
    const last = visual.lastAttemptAt ?? visual.generatedAt;
    if (last && Date.now() - new Date(last).getTime() < VISUAL_RETRY_MS) return false;
  }
  return true;
}

function needsEnrichment(idea: Idea): boolean {
  return needsTextEnrichment(idea) || needsVisual(idea);
}

export function IdeasAutoEnrichmentRunner({ items }: { items: Idea[] }) {
  const upsertIdea = useIdeasStore((s) => s.upsertIdea);
  const queuedRef = useRef(new Set<string>());
  const runningRef = useRef(false);

  useEffect(() => {
    if (runningRef.current) return;

    const candidates = items.filter(
      (idea) => needsEnrichment(idea) && !queuedRef.current.has(idea.id),
    );
    if (candidates.length === 0) return;

    // Build a batch, throttling image generation to MAX_VISUAL_PER_BATCH.
    // Visual-only ideas beyond that budget are deferred (not marked queued)
    // so a later run picks them up after the store updates.
    const batch: Array<{ idea: Idea; includeVisual: boolean }> = [];
    let visualBudget = MAX_VISUAL_PER_BATCH;
    for (const idea of candidates) {
      const wantsText = needsTextEnrichment(idea);
      const doVisual = needsVisual(idea) && visualBudget > 0;
      if (!wantsText && !doVisual) continue;
      if (doVisual) visualBudget -= 1;
      batch.push({ idea, includeVisual: doVisual });
      if (batch.length >= MAX_PER_BATCH) break;
    }
    if (batch.length === 0) return;

    let cancelled = false;
    runningRef.current = true;
    for (const { idea } of batch) queuedRef.current.add(idea.id);

    void (async () => {
      for (const { idea, includeVisual } of batch) {
        if (cancelled) break;
        try {
          const enriched = await fetchIdeaAutoEnrich({ ideaId: idea.id, includeVisual });
          if (!cancelled) upsertIdea(enriched);
        } catch (err) {
          console.warn(
            "[ideas] background auto-enrich failed:",
            err instanceof Error ? err.message : String(err),
          );
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
