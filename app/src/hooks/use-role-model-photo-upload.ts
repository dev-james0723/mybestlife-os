"use client";

/**
 * useRoleModelPhotoUpload
 *
 * Wraps `uploadRoleModelPhoto` with a small state machine the PhotoEditor
 * can drive UI from:
 *
 *   idle ─► uploading ─► success
 *      ▲                    │
 *      │                    ▼
 *      └────── error ◄──────┘
 *
 * Returned errors carry a stable code (not a localized string) so the form
 * can render the right i18n message:
 *   - "wrong_type"  — MIME not in the allow-list
 *   - "too_large"   — exceeded 5 MB
 *   - "empty"       — 0-byte file
 *   - "auth"        — not signed in
 *   - "unknown"     — anything else (network, RLS rejection, etc.)
 *
 * The hook does NOT mutate the role model. On success, the parent receives
 * the public URL via the `run()` return value and is responsible for stuffing
 * it into the form draft.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  uploadRoleModelPhoto,
  validatePhotoFile,
  type UploadRoleModelPhotoResult,
} from "@/lib/role-models/photo-storage";

export type RoleModelPhotoUploadStatus =
  | "idle"
  | "uploading"
  | "success"
  | "error";

export type RoleModelPhotoUploadErrorCode =
  | "wrong_type"
  | "too_large"
  | "empty"
  | "auth"
  | "unknown";

export type UseRoleModelPhotoUploadReturn = {
  status: RoleModelPhotoUploadStatus;
  error: RoleModelPhotoUploadErrorCode | null;
  isUploading: boolean;
  /**
   * Validate + upload. Resolves to the upload result, or null on validation
   * failure / cancellation. Errors are surfaced via state, never thrown.
   */
  run: (
    file: File,
    opts?: { roleModelId?: string | null },
  ) => Promise<UploadRoleModelPhotoResult | null>;
  /** Reset to idle, clearing any error. */
  reset: () => void;
};

export function useRoleModelPhotoUpload(): UseRoleModelPhotoUploadReturn {
  const [status, setStatus] = useState<RoleModelPhotoUploadStatus>("idle");
  const [error, setError] = useState<RoleModelPhotoUploadErrorCode | null>(
    null,
  );

  // Generation token to ignore late results from a stale upload (the user may
  // pick file A then quickly drop file B — A's success must not overwrite B).
  const genRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    genRef.current += 1;
  }, []);

  const run = useCallback(
    async (
      file: File,
      opts?: { roleModelId?: string | null },
    ): Promise<UploadRoleModelPhotoResult | null> => {
      const validation = validatePhotoFile(file);
      if (!validation.ok) {
        setError(validation.reason);
        setStatus("error");
        return null;
      }

      const myGen = ++genRef.current;
      setError(null);
      setStatus("uploading");

      try {
        const result = await uploadRoleModelPhoto({
          file,
          roleModelId: opts?.roleModelId ?? null,
        });
        if (!mountedRef.current || myGen !== genRef.current) return null;
        setStatus("success");
        return result;
      } catch (err) {
        if (!mountedRef.current || myGen !== genRef.current) return null;
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("not authenticated")) {
          setError("auth");
        } else {
          setError("unknown");
        }
        setStatus("error");
        return null;
      }
    },
    [],
  );

  return {
    status,
    error,
    isUploading: status === "uploading",
    run,
    reset,
  };
}
