"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  title: string;
  className?: string;
};

/**
 * Full-height PDF preview inside the knowledge detail sheet (browser-native viewer).
 */
export function KnowledgePdfViewer({ src, title, className }: Props) {
  const safeSrc = `${src}#view=FitH`;

  return (
    <div
      className={cn(
        "flex min-h-[min(70vh,720px)] flex-col overflow-hidden rounded-xl border border-white/12 bg-black/25 shadow-inner",
        className,
      )}
    >
      <iframe
        title={title}
        src={safeSrc}
        className="h-[min(70vh,720px)] w-full flex-1 border-0 bg-muted/30"
      />
    </div>
  );
}
