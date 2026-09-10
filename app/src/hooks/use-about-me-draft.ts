"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { aboutMeRepository } from "@/lib/repositories/about-me";
import { questionnaireFingerprint, readQuestionnaire, type Questionnaire } from "@/lib/about-me-questionnaire";
import type { AboutMe } from "@/types/database";

export function useAboutMeDraft(initial: AboutMe | null) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(() => readQuestionnaire(initial?.sections));
  const [status, setStatus] = useState<"saved" | "dirty" | "saving" | "error" | "conflict">("saved");
  const [conflicting, setConflicting] = useState<AboutMe | null>(null);
  const [savedAt, setSavedAt] = useState(initial?.updated_at ?? null);
  const latest = useRef(draft);
  const acknowledged = useRef(draft);
  const running = useRef<Promise<boolean> | null>(null);
  const mounted = useRef(true);
  const flush = useCallback((): Promise<boolean> => {
    if (running.current) return running.current;
    if (questionnaireFingerprint(latest.current) === questionnaireFingerprint(acknowledged.current)) return Promise.resolve(true);
    running.current = (async () => {
      try {
        while (questionnaireFingerprint(latest.current) !== questionnaireFingerprint(acknowledged.current)) {
          if (mounted.current) setStatus("saving");
          const snapshot = latest.current;
          const result = await aboutMeRepository.saveQuestionnaire(snapshot, acknowledged.current);
          acknowledged.current = snapshot;
          queryClient.setQueryData(["about-me"], result);
          if (mounted.current) setSavedAt(result.updated_at);
        }
        if (mounted.current) setStatus("saved");
        return true;
      } catch (error) {
        if (error instanceof Error && error.message === "ABOUT_ME_CONFLICT") {
          try { const row = await aboutMeRepository.get(); if (mounted.current) setConflicting(row); } catch { /* Keep the draft and allow retry. */ }
        }
        if (mounted.current) setStatus(error instanceof Error && error.message === "ABOUT_ME_CONFLICT" ? "conflict" : "error");
        return false;
      } finally { running.current = null; }
    })();
    return running.current;
  }, [queryClient]);
  const change = (update: (current: Questionnaire) => Questionnaire) => {
    const next = update(latest.current);
    latest.current = next;
    setDraft(next);
    setStatus("dirty");
  };
  useEffect(() => {
    if (status !== "dirty") return;
    const timeout = setTimeout(() => void flush(), 650);
    return () => clearTimeout(timeout);
  }, [draft, status, flush]);
  useEffect(() => {
    mounted.current = true;
    const warn = (event: BeforeUnloadEvent) => {
      if (questionnaireFingerprint(latest.current) !== questionnaireFingerprint(acknowledged.current)) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => { mounted.current = false; window.removeEventListener("beforeunload", warn); void flush(); };
  }, [flush]);
  const resolveConflict = (keepDraft: boolean) => {
    if (!conflicting) return;
    const remote = readQuestionnaire(conflicting.sections);
    acknowledged.current = remote;
    if (!keepDraft) { latest.current = remote; setDraft(remote); }
    setSavedAt(conflicting.updated_at);
    queryClient.setQueryData(["about-me"], conflicting);
    setConflicting(null);
    setStatus(keepDraft ? "dirty" : "saved");
  };
  return { draft, change, flush, status, savedAt, conflicting, resolveConflict };
}
