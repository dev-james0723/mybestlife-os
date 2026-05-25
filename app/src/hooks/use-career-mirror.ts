"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useCareerProfile,
  useUpsertCareerProfile,
} from "@/hooks/use-career-profile";
import { computeSetupCompletionScore } from "@/lib/career-mirror/careerSetupMapping";
import type {
  SetupAnswers,
  SetupAnswer,
} from "@/lib/career-mirror/careerSetupTypes";
import type {
  CareerProfile,
  CareerSetupStatus,
} from "@/types/database";

/** Career-profile React Query key (mirrors use-career-profile). */
const CAREER_PROFILE_KEY = ["career-profile"] as const;

/**
 * Discriminated network result. Every async call below resolves with one of
 * these and NEVER throws into the calling component, so the wizard can always
 * render a loading/error/success state instead of crashing.
 */
export type MirrorResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export type SynthesizeResult = MirrorResult<{
  profile: CareerProfile;
  modelUsed: string | null;
}>;

export type AutofillResult = MirrorResult<{
  suggestions: Record<string, { value: unknown }>;
  confidence: Record<string, number>;
}>;

export type SectionInsightResult = MirrorResult<{ insight: string }>;

export type BannerResult = MirrorResult<{
  banner_url: string | null;
  status: string;
  modelUsed: string | null;
}>;

const DEFAULT_ERROR = "request_failed";

/** POST helper that converts thrown/network/`{ok:false}` errors into a result. */
async function postJson<T>(
  url: string,
  body: unknown,
): Promise<MirrorResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    let json: Record<string, unknown> | null = null;
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      json = null;
    }
    if (!res.ok || !json || json.ok !== true) {
      const error =
        (json && typeof json.error === "string" && json.error) ||
        `http_${res.status}`;
      return { ok: false, error };
    }
    return json as unknown as MirrorResult<T>;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : DEFAULT_ERROR,
    };
  }
}

export type UseCareerMirror = {
  /** Current persisted career profile (or null when none yet). */
  profile: CareerProfile | null;
  /** Draft answers seeded from `profile.setup_answers`. */
  draftAnswers: SetupAnswers;
  isLoading: boolean;
  isSaving: boolean;
  /** Debounced (~800ms) autosave of the draft answers + status + score. */
  saveDraft: (answers: SetupAnswers, status?: CareerSetupStatus) => void;
  /** Flush any pending debounced save immediately (returns the awaited save). */
  flushDraft: (answers: SetupAnswers, status?: CareerSetupStatus) => Promise<void>;
  synthesize: (answers: SetupAnswers) => Promise<SynthesizeResult>;
  autofill: (categories?: string[]) => Promise<AutofillResult>;
  sectionInsight: (
    section: string,
    answers: SetupAnswers,
  ) => Promise<SectionInsightResult>;
  generateBanner: (
    style: string,
    portraitDataUrl?: string,
  ) => Promise<BannerResult>;
};

const SAVE_DEBOUNCE_MS = 800;

/**
 * Central data hook for the AI Career Mirror setup wizard. Owns the draft
 * answers seed, a debounced autosave, and typed (never-throwing) wrappers for
 * the four Career Mirror API endpoints. Synthesize/banner invalidate the
 * career-profile query so the rest of the app sees the fresh row.
 */
export function useCareerMirror(): UseCareerMirror {
  const qc = useQueryClient();
  const profileQuery = useCareerProfile();
  const upsert = useUpsertCareerProfile();

  const profile = (profileQuery.data as CareerProfile | null) ?? null;

  const draftAnswers = React.useMemo<SetupAnswers>(() => {
    const raw = profile?.setup_answers;
    if (raw && typeof raw === "object") {
      return raw as SetupAnswers;
    }
    return {};
  }, [profile?.setup_answers]);

  // --- Debounced autosave ---------------------------------------------------
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const upsertRef = React.useRef(upsert);
  React.useEffect(() => {
    upsertRef.current = upsert;
  });

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const runSave = React.useCallback(
    async (answers: SetupAnswers, status: CareerSetupStatus) => {
      await upsertRef.current.mutateAsync({
        setup_answers: answers as Record<string, SetupAnswer>,
        setup_status: status,
        completion_score: computeSetupCompletionScore(answers),
      } as Parameters<typeof upsertRef.current.mutateAsync>[0]);
    },
    [],
  );

  const saveDraft = React.useCallback(
    (answers: SetupAnswers, status: CareerSetupStatus = "in_progress") => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void runSave(answers, status);
      }, SAVE_DEBOUNCE_MS);
    },
    [runSave],
  );

  const flushDraft = React.useCallback(
    async (answers: SetupAnswers, status: CareerSetupStatus = "in_progress") => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      await runSave(answers, status);
    },
    [runSave],
  );

  // --- Network wrappers -----------------------------------------------------
  const synthesize = React.useCallback(
    async (answers: SetupAnswers): Promise<SynthesizeResult> => {
      const result = await postJson<{
        profile: CareerProfile;
        modelUsed: string | null;
      }>("/api/career/mirror/synthesize", { answers });
      if (result.ok) {
        if (result.profile) qc.setQueryData(CAREER_PROFILE_KEY, result.profile);
        void qc.invalidateQueries({ queryKey: CAREER_PROFILE_KEY });
      }
      return result;
    },
    [qc],
  );

  const autofill = React.useCallback(
    async (categories?: string[]): Promise<AutofillResult> =>
      postJson<{
        suggestions: Record<string, { value: unknown }>;
        confidence: Record<string, number>;
      }>("/api/career/mirror/autofill", categories ? { categories } : {}),
    [],
  );

  const sectionInsight = React.useCallback(
    async (
      section: string,
      answers: SetupAnswers,
    ): Promise<SectionInsightResult> =>
      postJson<{ insight: string }>("/api/career/mirror/section-insight", {
        section,
        answers,
      }),
    [],
  );

  const generateBanner = React.useCallback(
    async (style: string, portraitDataUrl?: string): Promise<BannerResult> => {
      const result = await postJson<{
        banner_url: string | null;
        status: string;
        modelUsed: string | null;
      }>("/api/career/mirror/banner", {
        style,
        ...(portraitDataUrl ? { portraitDataUrl } : {}),
      });
      if (result.ok) {
        void qc.invalidateQueries({ queryKey: CAREER_PROFILE_KEY });
      }
      return result;
    },
    [qc],
  );

  return {
    profile,
    draftAnswers,
    isLoading: profileQuery.isLoading,
    isSaving: upsert.isPending,
    saveDraft,
    flushDraft,
    synthesize,
    autofill,
    sectionInsight,
    generateBanner,
  };
}

export default useCareerMirror;
