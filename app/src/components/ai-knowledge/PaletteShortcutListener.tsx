"use client";

import { useEffect } from "react";
import { usePromptStore } from "@/stores/prompt-store";

/**
 * Binds ⌘K / Ctrl+K to toggle the AI Knowledge command palette while any
 * ai-knowledge route is mounted. Uses `keydown` on window with capture so
 * it wins over scoped editors, but defers to form inputs / contenteditable
 * to avoid hijacking typing.
 */
export function PaletteShortcutListener() {
  const openPalette = usePromptStore((s) => s.openPalette);
  const closePalette = usePromptStore((s) => s.closePalette);
  const isPaletteOpen = usePromptStore((s) => s.isPaletteOpen);

  useEffect(() => {
    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return true;
      }
      return el.isContentEditable;
    };

    const handler = (e: KeyboardEvent) => {
      const metaOrCtrl = e.metaKey || e.ctrlKey;
      if (metaOrCtrl && e.key.toLowerCase() === "k") {
        if (isEditable(e.target) && !isPaletteOpen) {
          // Let the input keep focus unless user already triggered palette.
        }
        e.preventDefault();
        if (isPaletteOpen) {
          closePalette();
        } else {
          openPalette();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openPalette, closePalette, isPaletteOpen]);

  return null;
}
