"use client";

import { useEffect } from "react";
import { useIdeaCaptureStore } from "@/stores/ideaCaptureStore";

/**
 * Registers the global Cmd/Ctrl+Shift+I keyboard shortcut that toggles the
 * Idea Capture sheet. Call this hook once — inside IdeaCaptureSheet — so the
 * shortcut is active whenever the protected layout is mounted.
 *
 * Note on Ctrl+Shift+I (Windows/Linux): this combination opens DevTools in
 * Chrome on Windows. We call preventDefault() so our shortcut takes priority.
 * Users who need DevTools can use F12 or the menu instead.
 */
export function useIdeaCaptureTrigger(): void {
  const toggle = useIdeaCaptureStore((s) => s.toggle);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // Cmd+Shift+I (macOS) / Ctrl+Shift+I (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "I") {
        e.preventDefault();
        toggle();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);
}
