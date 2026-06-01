"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { useBucketReflections } from "@/hooks/use-bucket-list";
import { useBucketDreamImage } from "@/hooks/use-bucket-dream-image";
import type { BucketItem } from "@/types/bucket-list";

import { DreamCoverBackground } from "../dream-cover-background";

/**
 * Rich memory card for a realized dream: completion photo (or cover), mood,
 * the one-line AI memory, completed date, and life chapter — all from stored
 * data only.
 */
export function RealizedDreamStoryCard({
  item,
  onClick,
}: {
  item: BucketItem;
  onClick: () => void;
}) {
  const { data: reflections } = useBucketReflections(item.id);
  const latest = reflections?.[0] ?? null;
  const fallbackImage = useBucketDreamImage(item);

  const photoUrl = latest?.photo_gallery?.[0]?.url ?? null;
  const completedLabel = useMemo(() => {
    if (!item.completed_at) return "";
    const d = new Date(item.completed_at);
    if (Number.isNaN(d.getTime())) return "";
    return d
      .toLocaleDateString(undefined, { month: "short", year: "numeric" })
      .toUpperCase();
  }, [item.completed_at]);

  const lifeChapter = latest?.ai_memory?.lifeChapter ?? null;
  const memoryLine = latest?.ai_summary ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative h-44 w-[min(100%,260px)] shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 text-left transition-all",
        "md:w-full md:min-w-0 md:shrink",
        "hover:-translate-y-0.5 hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70",
      )}
      aria-label={item.title}
    >
      {photoUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- memory photo from our bucket / user URL */}
          <img
            src={photoUrl}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/85" />
        </>
      ) : (
        <DreamCoverBackground
          image={fallbackImage}
          type={item.type}
          variant="card"
          interactive
        />
      )}

      <div className="relative z-[2] flex h-full flex-col justify-end p-3 pr-9">
        {lifeChapter ? (
          <span className="mb-1 line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-lime-300">
            {lifeChapter}
          </span>
        ) : null}
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-white">
          {item.title}
        </span>
        {memoryLine ? (
          <span className="mt-1 line-clamp-2 text-[12px] italic text-white/75">
            &ldquo;{memoryLine}&rdquo;
          </span>
        ) : null}
        <span className="mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
          {completedLabel ? <span>{completedLabel}</span> : null}
          {latest?.mood ? <span className="text-white/55">· {latest.mood}</span> : null}
        </span>
      </div>

      <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-lime-300/40 bg-black/50 text-lime-300">
        <Sparkles className="h-3 w-3" />
      </span>
    </button>
  );
}
