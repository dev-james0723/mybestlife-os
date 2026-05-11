"use client";

import dynamic from "next/dynamic";
import { useQuoteLibraryStore } from "@/stores/quote-library-store";
import { LibraryShell } from "@/components/quote-library/library-shell";
import { QuoteList } from "@/components/quote-library/quote-list";
import { AddQuoteSheet } from "@/components/quote-library/add-quote-sheet";
import { QuoteDetailDialog } from "@/components/quote-library/quote-detail-dialog";
import { QuoteOfTheDayCard } from "@/components/quote-library/quote-of-the-day-card";
import { useQuoteLibraryFirstVisit } from "@/hooks/use-quote-library-first-visit";
import { useQuoteLibraryShortcuts } from "@/hooks/use-quote-library-shortcuts";

// Heavier tabs are split out so the default (All quotes) ships a leaner
// first-paint bundle. Recharts + the Wisdom Profile tree only load when the
// user navigates to their respective tabs.
const CollectionsTab = dynamic(
  () =>
    import("@/components/quote-library/collections-tab").then((mod) => ({
      default: mod.CollectionsTab,
    })),
  { ssr: false },
);
const WisdomProfileTab = dynamic(
  () =>
    import("@/components/quote-library/wisdom-profile-tab").then((mod) => ({
      default: mod.WisdomProfileTab,
    })),
  { ssr: false },
);

export default function QuoteLibraryPage() {
  const tab = useQuoteLibraryStore((s) => s.tab);
  const openAddSheet = useQuoteLibraryStore((s) => s.openAddSheet);
  useQuoteLibraryFirstVisit();
  useQuoteLibraryShortcuts();

  return (
    <>
      <LibraryShell>
        {tab === "all" ? (
          <div className="flex flex-col gap-5">
            <QuoteOfTheDayCard />
            <QuoteList onAddQuote={openAddSheet} />
          </div>
        ) : null}
        {tab === "collections" ? <CollectionsTab /> : null}
        {tab === "wisdom" ? <WisdomProfileTab /> : null}
      </LibraryShell>
      <AddQuoteSheet />
      <QuoteDetailDialog />
    </>
  );
}
