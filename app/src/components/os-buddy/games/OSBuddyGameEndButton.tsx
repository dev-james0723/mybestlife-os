"use client";

import { X } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/app-locale";

type OSBuddyGameEndButtonProps = {
  locale: AppLocale;
  isFinished: boolean;
  onClose: () => void;
};

export function OSBuddyGameEndButton({
  locale,
  isFinished,
  onClose,
}: OSBuddyGameEndButtonProps) {
  const zh = locale === "zh-TW";
  const label = isFinished
    ? zh
      ? "關閉遊戲"
      : "Close game"
    : zh
      ? "結束遊戲"
      : "End game";
  const visibleLabel = isFinished ? (zh ? "關閉" : "Close") : zh ? "結束" : "End";

  return (
    <button
      type="button"
      data-os-buddy-game-control
      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-red-300/70 bg-red-600 px-3 font-sans text-xs font-black tracking-normal text-white shadow-[0_0_0_1px_rgba(255,255,255,0.14)_inset,0_8px_18px_rgba(220,38,38,0.35)] outline-none transition hover:bg-red-500 active:translate-y-px focus-visible:ring-2 focus-visible:ring-red-300/80 motion-reduce:transition-none"
      aria-label={label}
      title={label}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <X className="size-4" strokeWidth={3} aria-hidden />
      <span className="hidden sm:inline">{visibleLabel}</span>
    </button>
  );
}
