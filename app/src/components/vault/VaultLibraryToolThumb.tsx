"use client";

import { useState } from "react";
import type { VaultLibraryTool } from "@/lib/vault/software-library-schema";
import { libraryToolIconUrl } from "@/lib/vault/library-tool-icon-url";
import { cn } from "@/lib/utils";

type Props = {
  tool: VaultLibraryTool;
  /** Pixel size (width & height). Default 40 to match sheet layout. */
  size?: number;
  className?: string;
};

/**
 * Square logo for a curated or model-suggested library tool.
 * Prefers explicit `icon_url`; otherwise loads the favicon for `website_url` via Google s2.
 */
export function VaultLibraryToolThumb({ tool, size = 40, className }: Props) {
  const [hideImg, setHideImg] = useState(false);
  const url = libraryToolIconUrl(tool);
  const letter = (tool.name.trim().slice(0, 1) || "?").toUpperCase();
  const px = `${size}px`;

  if (!url || hideImg) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/50 font-semibold text-muted-foreground",
          className,
        )}
        style={{ width: px, height: px, fontSize: Math.max(11, Math.round(size * 0.36)) }}
        aria-hidden
      >
        {letter}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className={cn(
        "shrink-0 rounded-md border border-border/60 bg-background object-contain shadow-sm",
        className,
      )}
      style={{ width: px, height: px }}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setHideImg(true)}
    />
  );
}
