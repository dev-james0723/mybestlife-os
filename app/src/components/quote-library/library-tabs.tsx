"use client";

import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <Tabs
      value={tab}
      onValueChange={(next) => next && setTab(next as QuoteLibraryTab)}
    >
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="all">
          <QuoteIcon className="size-4" aria-hidden />
          <span>{copy.tabAll}</span>
        </TabsTrigger>
        <TabsTrigger value="collections">
          <FolderHeart className="size-4" aria-hidden />
          <span>{copy.tabCollections}</span>
        </TabsTrigger>
        <TabsTrigger value="wisdom">
          <Sparkles className="size-4" aria-hidden />
          <span>{copy.tabWisdom}</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
