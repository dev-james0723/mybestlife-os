"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import type { ZodType } from "zod";
import { useAuth } from "@/hooks/use-auth";

/** Browser-local recovery, isolated by signed-in account and validated on read. */
export function useAccountDraft<T>(kind: string, initial: T, schema: ZodType<T>) {
  const { user, isLoading } = useAuth();
  const key = user ? `mybestlife:draft:v1:${user.id}:${kind}` : null;
  const [initialValue] = useState(() => initial);
  const [state, setState] = useState<{ key: string | null; value: T; loaded: boolean; dirty: boolean }>({ key: null, value: initial, loaded: false, dirty: false });
  const [storageError, setStorageError] = useState(false);
  const cleared = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    cleared.current = false;
    let value = initialValue;
    let failed = false;
    if (key) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const result = schema.safeParse(JSON.parse(raw));
          if (result.success) value = result.data;
          else failed = true;
        }
      } catch { failed = true; }
    }
    setStorageError(failed || !key);
    setState({ key, value, loaded: true, dirty: false });
  }, [key, isLoading, schema, initialValue]);

  useEffect(() => {
    if (!key || state.key !== key || !state.loaded || !state.dirty || cleared.current) return;
    try { localStorage.setItem(key, JSON.stringify(state.value)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [key, state]);

  const setDraft = useCallback((next: SetStateAction<T>) => {
    cleared.current = false;
    setState((previous) => previous.key === key ? {
      ...previous,
      dirty: true,
      value: typeof next === "function" ? (next as (value: T) => T)(previous.value) : next,
    } : previous);
  }, [key]);
  const clearDraft = useCallback(() => {
    cleared.current = true;
    if (key) {
      try { localStorage.removeItem(key); }
      catch { setStorageError(true); }
    }
  }, [key]);

  return { draft: state.key === key ? state.value : initialValue, setDraft, clearDraft, ready: !isLoading && state.loaded && state.key === key, storageError };
}
