"use client";

/**
 * useRoleModelAutoFill
 *
 * Drives the "Auto-fill with AI" hero interaction on the Role Model form.
 *
 * Status state machine
 * --------------------
 *
 *   idle ─► researching ─► extracting ─► success
 *      ▲          │              │
 *      │          ▼              ▼
 *      └──────── error ◄────── error
 *      └──────── (cancel) ◄──── (cancel)
 *
 * The server route at `POST /api/ai/role-model/autofill` performs *both* AI
 * calls in a single request (research + structured extraction). We don't have
 * intermediate progress events from the server, so we approximate the visual
 * UX by transitioning `researching → extracting` after `extractingAfterMs`
 * (default 4s). The user experience is "AI is working", which is true.
 *
 * Design notes
 * ------------
 * - Cancellable: backed by `AbortController`. Calling `cancel()` aborts the
 *   in-flight fetch and resets the status to `idle`. A new `run()` while one
 *   is pending will abort the previous attempt automatically.
 * - Locale-aware: passes the current app language so the route can ask the
 *   model for output in the user's tongue.
 * - No toasts here. The hook is pure state — UI components decide whether to
 *   show a toast on success/failure (we want consistency with the rest of
 *   the codebase, where toasts live next to user actions).
 * - No data writes. The result is only ever returned to the caller; saving
 *   is an explicit user action ("review-first").
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import type {
  RoleModelAutoFillResponse,
  RoleModelAutofillContextPayload,
  RoleModelAutoFillResult,
  RoleModelAutoFillStatus,
} from "@/types/role-model";

/** Subset of {@link RoleModelAutoFillResponse} that callers usually care about. */
export type RoleModelAutoFillMeta = RoleModelAutoFillResponse["meta"];

/** Public state surface exposed by {@link useRoleModelAutoFill}. */
export type UseRoleModelAutoFillState = {
  status: RoleModelAutoFillStatus;
  result: RoleModelAutoFillResult | null;
  meta: RoleModelAutoFillMeta | null;
  error: string | null;
  /** Raw server `detail` string when `error === "ai_generation_failed"` — for debugging / toast descriptions. */
  errorDetail: string | null;
  isLoading: boolean;
};

/** Public action surface exposed by {@link useRoleModelAutoFill}. */
export type UseRoleModelAutoFillActions = {
  /**
   * Start the auto-fill flow. Returns the result on success, or `null` on
   * error / cancellation. Throws are caught internally — the hook surfaces
   * everything via state.
   */
  run: (
    name: string,
    context?: RoleModelAutofillContextPayload,
  ) => Promise<RoleModelAutoFillResult | null>;
  /** Abort an in-flight request and reset to `idle`. */
  cancel: () => void;
  /** Wipe the previous result/error/status without making a network call. */
  reset: () => void;
};

export type UseRoleModelAutoFillReturn = UseRoleModelAutoFillState &
  UseRoleModelAutoFillActions;

type Options = {
  /**
   * Visual ms threshold after which we transition `researching → extracting`.
   * Purely cosmetic — the underlying request is still a single round-trip.
   */
  extractingAfterMs?: number;
};

const DEFAULT_EXTRACTING_AFTER_MS = 4_000;

export function useRoleModelAutoFill(
  opts: Options = {},
): UseRoleModelAutoFillReturn {
  const { extractingAfterMs = DEFAULT_EXTRACTING_AFTER_MS } = opts;
  const language = useAppStore((s) => s.language);

  const [status, setStatus] = useState<RoleModelAutoFillStatus>("idle");
  const [result, setResult] = useState<RoleModelAutoFillResult | null>(null);
  const [meta, setMeta] = useState<RoleModelAutoFillMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPhaseTimer = useCallback(() => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearPhaseTimer();
    setStatus("idle");
    setResult(null);
    setMeta(null);
    setError(null);
    setErrorDetail(null);
  }, [clearPhaseTimer]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    clearPhaseTimer();
    setStatus("idle");
    setErrorDetail(null);
  }, [clearPhaseTimer]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      clearPhaseTimer();
    };
  }, [clearPhaseTimer]);

  const run = useCallback(
    async (
      rawName: string,
      context?: RoleModelAutofillContextPayload,
    ): Promise<RoleModelAutoFillResult | null> => {
      const name = rawName.trim();
      if (!name) {
        setError("MISSING_NAME");
        setErrorDetail(null);
        setStatus("error");
        return null;
      }

      // Abort any prior in-flight request and clear timers.
      abortRef.current?.abort();
      clearPhaseTimer();

      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setErrorDetail(null);
      setResult(null);
      setMeta(null);
      setStatus("researching");

      // Cosmetic phase transition so the user sees the work progressing.
      phaseTimerRef.current = setTimeout(() => {
        // Only flip if we're still researching with the same controller.
        if (!controller.signal.aborted) {
          setStatus((prev) => (prev === "researching" ? "extracting" : prev));
        }
      }, extractingAfterMs);

      try {
        const response = await fetch("/api/ai/role-model/autofill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name,
            language,
            ...(context ? { context } : {}),
          }),
          signal: controller.signal,
        });

        clearPhaseTimer();

        if (!response.ok) {
          // Try to extract the server's error message; fall back to status.
          let serverMessage: string | null = null;
          let detail: string | null = null;
          try {
            const body = (await response.json()) as {
              error?: unknown;
              detail?: unknown;
            };
            if (typeof body.error === "string") serverMessage = body.error;
            if (typeof body.detail === "string") detail = body.detail;
          } catch {
            // ignore — we'll use a generic message
          }
          setError(serverMessage ?? `HTTP_${response.status}`);
          setErrorDetail(detail);
          setStatus("error");
          return null;
        }

        const data = (await response.json()) as RoleModelAutoFillResponse;

        if (controller.signal.aborted) {
          // The request settled but the user already cancelled — discard.
          return null;
        }

        setResult(data.result);
        setMeta(data.meta);
        setStatus("success");
        return data.result;
      } catch (err) {
        clearPhaseTimer();

        // Aborted = user-initiated cancel; do nothing visible.
        if (err instanceof DOMException && err.name === "AbortError") {
          return null;
        }
        setError(err instanceof Error ? err.message : "UNKNOWN_ERROR");
        setErrorDetail(null);
        setStatus("error");
        return null;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [clearPhaseTimer, extractingAfterMs, language],
  );

  return {
    status,
    result,
    meta,
    error,
    errorDetail,
    isLoading: status === "researching" || status === "extracting",
    run,
    cancel,
    reset,
  };
}
