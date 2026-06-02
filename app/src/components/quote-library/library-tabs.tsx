"use client";

import { useMemo } from "react";
import { OSSegmentedControl } from "@/components/ui/os-primitives";
import { useAppStore } from "@/stores/app-store";
import { useQuoteLibraryStore, type QuoteLibraryTab } from "@/stores/quote-library-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import { Quote as QuoteIcon, FolderHeart, Sparkles } from "lucide-react";

export function LibraryTabs() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);
  const tab = useQuoteLibraryStore((s) => s.tab);
  const setTab = useQuoteLibraryStore((s) => s.setTab);

  return (
    <OSSegmentedControl
      items={[
        { id: "all", label: copy.tabAll, icon: QuoteIcon },
        { id: "collections", label: copy.tabCollections, icon: FolderHeart },
        { id: "wisdom", label: copy.tabWisdom, icon: Sparkles },
      ]}
      value={tab}
      onValueChange={(next: QuoteLibraryTab) => setTab(next)}
      ariaLabel={copy.pageTitle}
      layoutId="quote-library-tab-pill"
    />
  );
}
