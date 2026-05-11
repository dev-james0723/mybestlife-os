"use client";

import { useMemo } from "react";
import { Quote as QuoteIcon } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import { useQuoteLibraryStore } from "@/stores/quote-library-store";
import { LibraryTabs } from "./library-tabs";
import { LibrarySearchBar } from "./library-search-bar";
import { AddQuoteButton } from "./add-quote-fab";
import { LibrarySettingsPopover } from "./library-settings-popover";

export function LibraryShell({ children }: { children: React.ReactNode }) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const tab = useQuoteLibraryStore((s) => s.tab);

  return (
    <>
      <PageShell
        title={copy.pageTitle}
        description={copy.pageDescription}
        actions={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <LibrarySettingsPopover />
            <AddQuoteButton />
          </div>
        }
      >
        <LibraryTabs />
        {tab === "all" ? <LibrarySearchBar /> : null}
        {children}
      </PageShell>
    </>
  );
}

/** Placeholder body rendered before Phase 2 wires the real list. */
export function LibraryPlaceholder({
  variant,
  onAddQuote,
}: {
  variant: "all" | "collections" | "wisdom";
  onAddQuote: () => void;
}) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);

  if (variant === "wisdom") {
    return (
      <EmptyState
        icon={QuoteIcon}
        title={copy.emptyWisdomTitle}
        description={copy.emptyWisdomDescription(0, 20)}
      />
    );
  }

  if (variant === "collections") {
    return (
      <EmptyState
        icon={QuoteIcon}
        title={copy.emptyCollectionsTitle}
        description={copy.emptyCollectionsDescription}
      />
    );
  }

  return (
    <EmptyState
      icon={QuoteIcon}
      title={copy.emptyAllTitle}
      description={copy.emptyAllDescription}
      action={{ label: copy.emptyAllAction, onClick: onAddQuote }}
    />
  );
}
