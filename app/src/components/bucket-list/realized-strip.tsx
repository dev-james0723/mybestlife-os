"use client";

import { useMemo } from "react";
import { MapPin, Sparkles, Car, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";
import { useBucketDreamImage } from "@/hooks/use-bucket-dream-image";
import { DreamCoverBackground } from "./dream-cover-background";

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
          <RealizedCard
            key={item.id}
            item={item}
            onClick={() => onSelect(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

function RealizedCard({
  item,
  onClick,
}: {
  item: BucketItem;
  onClick: () => void;
}) {
  const completedLabel = useMemo(() => {
    if (!item.completed_at) return "";
    const d = new Date(item.completed_at);
    if (Number.isNaN(d.getTime())) return "";
    return d
      .toLocaleDateString(undefined, { month: "short", year: "numeric" })
      .toUpperCase();
  }, [item.completed_at]);

  const image = useBucketDreamImage(item);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative h-32 w-[min(100%,240px)] shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 text-left transition-all",
        "md:w-full md:min-w-0 md:shrink",
        "hover:-translate-y-0.5 hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70",
      )}
      aria-label={item.title}
    >
      <DreamCoverBackground
        image={image}
        type={item.type}
        variant="card"
        interactive
      />
      {!image?.url ? (
        <div className="absolute inset-0 z-[1] flex items-center justify-center text-white/35">
          {iconFor(item)}
        </div>
      ) : null}
      <div className="relative z-[2] flex h-full flex-col justify-end p-3 pr-9">
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-white">
          {item.title}
        </span>
        {completedLabel ? (
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
            {completedLabel}
          </span>
        ) : null}
      </div>

      <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-lime-300/40 bg-black/50 text-lime-300">
        <Sparkles className="h-3 w-3" />
      </span>
    </button>
  );
}

function iconFor(item: BucketItem) {
  if (item.type === "travel") {
    return <MapPin className="h-8 w-8" aria-hidden />;
  }
  if (item.type === "purchase") {
    return <Car className="h-8 w-8" aria-hidden />;
  }
  return <Trophy className="h-8 w-8" aria-hidden />;
}
