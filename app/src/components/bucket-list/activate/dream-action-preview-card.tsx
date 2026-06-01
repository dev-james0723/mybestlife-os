"use client";

import { Checkbox } from "@/components/ui/checkbox";

/**
 * One reviewable suggested action with a selection checkbox. Selecting it is
 * what authorizes the write — unchecked items are never created.
 */
export function DreamActionPreviewCard({
  title,
  subtitle,
  meta,
  checked,
  onToggle,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        checked
          ? "border-lime-400/50 bg-lime-400/5"
          : "border-border bg-muted/20 hover:bg-muted/40"
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-[12px] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
        {meta ? (
          <span className="mt-0.5 block text-[11px] text-muted-foreground">{meta}</span>
        ) : null}
      </span>
    </label>
  );
}
