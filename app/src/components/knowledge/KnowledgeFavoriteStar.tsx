"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { setKnowledgeFavorite } from "@/lib/knowledge/mutations";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import type { KnowledgeItem } from "@/types/knowledge";

type KnowledgeFavoriteStarProps = {
  item: KnowledgeItem;
  variant?: "card" | "detail";
  className?: string;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function playFavoriteDing() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    gain.connect(ctx.destination);

    const first = ctx.createOscillator();
    first.type = "sine";
    first.frequency.setValueAtTime(880, now);
    first.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08);
    first.connect(gain);
    first.start(now);
    first.stop(now + 0.18);

    const second = ctx.createOscillator();
    second.type = "triangle";
    second.frequency.setValueAtTime(1760, now + 0.07);
    second.connect(gain);
    second.start(now + 0.07);
    second.stop(now + 0.24);

    window.setTimeout(() => void ctx.close().catch(() => {}), 320);
  } catch {
    /* Audio feedback is best-effort only. */
  }
}

export function KnowledgeFavoriteStar({
  item,
  variant = "card",
  className,
}: KnowledgeFavoriteStarProps) {
  const reduceMotion = useReducedMotion();
  const language = useAppStore((s) => s.language);
  const copy = getKnowledgeUiCopy(language).favorite;
  const upsertItem = useKnowledgeStore((s) => s.upsertItem);
  const [pending, setPending] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [spinDirection, setSpinDirection] = useState(1);
  const [burst, setBurst] = useState(false);

  const isActive = item.isFavorite;
  const sizeClass = variant === "detail" ? "h-10 w-10" : "h-8 w-8";
  const iconSizeClass = variant === "detail" ? "h-5 w-5" : "h-4 w-4";
  const shouldSpin = spinKey > 0 && !reduceMotion;

  async function handleToggle(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;

    const current =
      useKnowledgeStore.getState().items.find((candidate) => candidate.id === item.id) ??
      item;
    const nextFavorite = !current.isFavorite;
    const startedAt = performance.now();

    setPending(true);
    setSpinDirection(nextFavorite ? 1 : -1);
    setSpinKey((key) => key + 1);
    setBurst(true);
    window.setTimeout(() => setBurst(false), reduceMotion ? 80 : 560);

    const optimistic: KnowledgeItem = {
      ...current,
      isFavorite: nextFavorite,
      dateModified: new Date().toISOString(),
    };
    upsertItem(optimistic);

    try {
      const updated = await setKnowledgeFavorite(current.id, nextFavorite);
      const currentAfter =
        useKnowledgeStore
          .getState()
          .items.find((candidate) => candidate.id === updated.id) ?? optimistic;
      upsertItem({
        ...updated,
        connections: currentAfter.connections ?? current.connections ?? updated.connections,
        documentBrainJob:
          currentAfter.documentBrainJob ?? current.documentBrainJob ?? updated.documentBrainJob,
      });

      if (nextFavorite) {
        const remaining = (reduceMotion ? 0 : 460) - (performance.now() - startedAt);
        if (remaining > 0) await wait(remaining);
        playFavoriteDing();
        toast.success(copy.addedToast);
      } else {
        toast.success(copy.removedToast);
      }
    } catch {
      upsertItem(current);
      toast.error(copy.failedToast);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={cn(
        "pointer-events-auto relative inline-flex shrink-0 items-center justify-center overflow-visible rounded-full border border-white/25 bg-black/45 text-white shadow-[0_8px_20px_rgba(0,0,0,0.22)] backdrop-blur-md transition-[background-color,border-color,box-shadow,color,transform] hover:scale-105 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:cursor-wait disabled:opacity-80",
        sizeClass,
        isActive &&
          "border-amber-200/70 bg-amber-400/24 text-amber-200 shadow-[0_8px_24px_rgba(245,158,11,0.28)]",
        variant === "detail" &&
          "border-white/35 bg-black/50 shadow-[0_10px_28px_rgba(0,0,0,0.28)]",
        className,
      )}
      disabled={pending}
      onClick={handleToggle}
      aria-label={isActive ? copy.remove : copy.add}
      aria-pressed={isActive}
      aria-busy={pending}
      title={isActive ? copy.remove : copy.add}
    >
      <AnimatePresence>
        {burst && !reduceMotion ? (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full border border-amber-200/80"
            initial={{ opacity: 0.8, scale: 0.82 }}
            animate={{ opacity: 0, scale: 1.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.56, ease: "easeOut" }}
            aria-hidden
          />
        ) : null}
      </AnimatePresence>
      <motion.span
        key={spinKey}
        className="inline-flex"
        initial={shouldSpin ? { rotate: 0, scale: 1 } : false}
        animate={
          shouldSpin
            ? { rotate: spinDirection * 360, scale: [1, 1.22, 1] }
            : { rotate: 0, scale: 1 }
        }
        transition={{ duration: 0.52, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Star
          className={iconSizeClass}
          fill={isActive ? "currentColor" : "none"}
          strokeWidth={isActive ? 1.6 : 2.1}
          aria-hidden
        />
      </motion.span>
    </button>
  );
}
