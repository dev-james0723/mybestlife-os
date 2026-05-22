"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks unsaved form changes and:
 *   - registers a `beforeunload` listener that warns the user before closing
 *     the tab / navigating away;
 *   - exposes `confirmNavigate(action)` that the caller wraps around any
 *     in-page navigation (e.g. a nav chip click). When `hasUnsavedChanges`
 *     is true, the action is stashed and the dialog opens; the caller
 *     renders <UnsavedChangesDialog /> with `open` / `onCancel` / `onConfirm`
 *     bound to the values returned here.
 *
 * The hook deliberately does NOT intercept sidebar / topbar links — those
 * navigate via the global app shell and would require a router-level
 * intercept. Page-local navigation is the most common loss vector.
 */
export function useUnsavedChanges(hasUnsavedChanges: boolean) {
  const dirtyRef = useRef(hasUnsavedChanges);

  useEffect(() => {
    dirtyRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      // Modern browsers ignore custom strings; setting returnValue still
      // triggers the native confirm prompt.
      e.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const confirmNavigate = useCallback((action: () => void) => {
    if (!dirtyRef.current) {
      action();
      return;
    }
    setPendingAction(() => action);
  }, []);

  const cancel = useCallback(() => setPendingAction(null), []);

  const confirm = useCallback(() => {
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  }, [pendingAction]);

  return {
    confirmNavigate,
    dialogOpen: pendingAction !== null,
    cancel,
    confirm,
  };
}
