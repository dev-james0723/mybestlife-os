"use client";

import { htmlLooksLikeMarkup, RICH_TEXT_VIEW_CLASS } from "@/lib/utils/html";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null | undefined;
  empty?: string;
  className?: string;
};

/** Renders stored rich HTML or falls back to plain pre-wrap text. */
export function RichTextReadOnly({ value, empty = "—", className }: Props) {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{empty}</p>;
  }
  if (htmlLooksLikeMarkup(raw)) {
    return (
      <div
        className={cn(RICH_TEXT_VIEW_CLASS, className)}
        dangerouslySetInnerHTML={{ __html: raw }}
      />
    );
  }
  return <p className={cn("text-sm whitespace-pre-wrap", className)}>{raw}</p>;
}
