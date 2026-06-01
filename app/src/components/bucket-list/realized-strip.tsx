"use client";

import { useMemo } from "react";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";

import { RealizedDreamStoryCard } from "./memory/realized-dream-story-card";

type RealizedStripProps = {
  items: BucketItem[];
  onSelect: (bucketId: string) => void;
};

/**
 * Bottom strip — the "Realized Dreams (Memories)" row from the screenshot.
 * Horizontal scroll on small screens, grid on wider ones.
 */
export function BucketRealizedStrip({ items, onSelect }: RealizedStripProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="realized-dreams-heading" className="space-y-3">
      <h2
        id="realized-dreams-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55"
      >
        {copy.realizedDreamsHeader}
      </h2>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:snap-none md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] md:overflow-visible [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <RealizedDreamStoryCard
            key={item.id}
            item={item}
            onClick={() => onSelect(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
