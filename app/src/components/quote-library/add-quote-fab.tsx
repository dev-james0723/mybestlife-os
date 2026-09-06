"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useQuoteLibraryStore } from "@/stores/quote-library-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";

/**
 * Full add-quote affordance. On desktop renders inline via the PageShell
 * `actions` slot; on mobile docks to the bottom-right as a floating button.
 */
export function AddQuoteButton() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const openAddSheet = useQuoteLibraryStore((s) => s.openAddSheet);

  return (
    <Button
      onClick={openAddSheet}
      aria-label={copy.addQuoteAria}
      className="h-11 min-h-11 rounded-xl px-3"
    >
      <Plus className="mr-2 size-4" aria-hidden />
      {copy.addQuote}
    </Button>
  );
}

export function AddQuoteFab() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const openAddSheet = useQuoteLibraryStore((s) => s.openAddSheet);

  return (
    <button data-control-variant="default"
      type="button"
      onClick={openAddSheet}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-150 hover:scale-105 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none sm:hidden"
      aria-label={copy.addQuoteAria}
    >
      <Plus className="size-6" aria-hidden />
      <span className="sr-only">{copy.addQuote}</span>
    </button>
  );
}
