"use client";

import Image from "next/image";
import { THUMBNAIL_STYLES, type ThumbnailStyle } from "@/types/knowledge";
import {
  thumbnailStylePreviewSrc,
  THUMBNAIL_STYLE_DEFAULT_LABELS,
} from "@/lib/knowledge/thumbnail-style-config";
import { cn } from "@/lib/utils";

export type ThumbnailStylePickerI18n = {
  sectionTitle: string;
  /** Shown on the N/A tile (two lines). */
  naCardTitle: string;
  naCardSubtitle: string;
  /** Override button label per style (e.g. localized). */
  styleLabels?: Partial<Record<ThumbnailStyle, string>>;
};

interface ThumbnailStylePickerProps {
  value: ThumbnailStyle;
  onChange: (style: ThumbnailStyle) => void;
  /** When set, replaces English section title, N/A tile text, and style labels. */
  i18n?: ThumbnailStylePickerI18n;
  /** `scroll` = single horizontal row (default); `wrap` = flex-wrap grid. */
  layout?: "scroll" | "wrap";
}

export function ThumbnailStylePicker({
  value,
  onChange,
  i18n,
  layout = "scroll",
}: ThumbnailStylePickerProps) {
  const labelFor = (style: ThumbnailStyle) =>
    i18n?.styleLabels?.[style] ?? THUMBNAIL_STYLE_DEFAULT_LABELS[style];

  const listClass =
    layout === "scroll"
      ? "flex flex-nowrap gap-2 overflow-x-auto pb-1 pt-0.5 -mx-0.5 px-0.5 [scrollbar-gutter:stable]"
      : "flex flex-wrap gap-2";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {i18n?.sectionTitle ?? "Thumbnail Style"}
      </label>
      <div
        className={listClass}
        role="listbox"
        aria-label={i18n?.sectionTitle ?? "Thumbnail style"}
      >
        {THUMBNAIL_STYLES.map((style) => {
          const src = thumbnailStylePreviewSrc(style);
          const isSelected = value === style;
          const btnLabel = labelFor(style);
          return (
            <button
              key={style}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onChange(style)}
              className={cn(
                "flex shrink-0 snap-start flex-col items-center gap-1 group transition-transform",
                isSelected && "scale-105",
              )}
              aria-label={`${btnLabel} style`}
              aria-pressed={isSelected}
              title={`Example: ${btnLabel}`}
            >
              <div
                className={cn(
                  "relative w-16 h-12 overflow-hidden rounded-md border-2 transition-all bg-muted",
                  isSelected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent group-hover:border-border",
                )}
              >
                {src ? (
                  <Image
                    src={src}
                    alt={`${THUMBNAIL_STYLE_DEFAULT_LABELS[style]} thumbnail style example`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full flex flex-col items-center justify-center gap-0.5 bg-muted/40 px-1"
                    aria-hidden
                  >
                    <span className="text-[9px] font-medium text-muted-foreground leading-none">
                      {i18n?.naCardTitle ?? "Title"}
                    </span>
                    <span className="text-[8px] text-muted-foreground/80 leading-tight text-center">
                      {i18n?.naCardSubtitle ?? "only"}
                    </span>
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "max-w-[4.5rem] truncate text-center text-[10px]",
                  isSelected ? "text-primary font-medium" : "text-muted-foreground",
                )}
              >
                {btnLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
