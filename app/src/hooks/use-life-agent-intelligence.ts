"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  FutureSelfResponse,
  InnerConflictResponse,
  LifeChapterMapResponse,
  LifeCoherenceResponse,
  MemoryTimelineResponse,
} from "@/lib/life-agent/intelligence-types";

async function postIntelligence<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/life-agent/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = (await res.json()) as T & { error?: string; detail?: string };
  if (!res.ok) {
    throw new Error(json.detail ?? json.error ?? "intelligence_failed");
  }
  return json;
}

export function useLifeCoherence() {
  return useMutation({
    mutationFn: () => postIntelligence<LifeCoherenceResponse>("life-coherence"),
  });
}

export function useLifeChapters() {
  return useMutation({
    mutationFn: () => postIntelligence<LifeChapterMapResponse>("life-chapters"),
  });
}

export function useInnerConflicts() {
  return useMutation({
    mutationFn: () => postIntelligence<InnerConflictResponse>("inner-conflicts"),
  });
}

export function useMemoryTimeline() {
  return useMutation({
    mutationFn: () => postIntelligence<MemoryTimelineResponse>("memory-timeline"),
  });
}

export function useFutureSelf() {
  return useMutation({
    mutationFn: (futureYear?: number) =>
      postIntelligence<FutureSelfResponse>("future-self", { futureYear }),
  });
}
