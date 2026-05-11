"use client";

import { useMemo } from "react";
import { MapPin, Sparkles, Car, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";

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
      <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible md:grid-cols-4">
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

  const bgImage = item.cover_image_url;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative h-32 min-w-[240px] max-w-[320px] flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] text-left transition-all",
        "hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70",
      )}
      style={
        bgImage
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.75) 100%), url('${bgImage}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
      aria-label={item.title}
    >
      {!bgImage ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/35">
          {iconFor(item)}
        </div>
      ) : null}
      <div className="relative z-10 flex h-full flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3">
        <span className="line-clamp-1 text-sm font-semibold text-white">
          {item.title}
        </span>
        {completedLabel ? (
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
            {completedLabel}
          </span>
        ) : null}
      </div>

      {/* Corner accent */}
      <span className="absolute bottom-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-lime-300/40 bg-black/40 text-lime-300">
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
