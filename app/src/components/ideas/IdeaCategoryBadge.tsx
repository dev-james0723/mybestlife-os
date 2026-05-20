"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { displayCategory } from "@/lib/ideas/idea-helpers";
import type { Idea } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";

const ring: Record<string, string> = {
  product: "border-violet-500/35 bg-violet-500/8 text-violet-700 dark:text-violet-200",
  business: "border-sky-500/35 bg-sky-500/8 text-sky-800 dark:text-sky-200",
  tech: "border-emerald-500/35 bg-emerald-500/8 text-emerald-800 dark:text-emerald-200",
  personal: "border-rose-500/35 bg-rose-500/8 text-rose-800 dark:text-rose-200",
  random: "border-border/80 bg-muted/40 text-muted-foreground",
};

export function IdeaCategoryBadge({
  category,
  language,
  className,
}: {
  category: Idea["category"] | string | null | undefined;
  language: AppLocale;
  className?: string;
}) {
  const ui = getIdeasUiCopy(language);
  const slug = displayCategory(category);
  const label = ui.categoryLabels[slug] ?? slug;
  const palette = ring[slug] ?? ring.random;
  return (
    <Badge variant="outline" className={cn("shrink-0 text-[10px] font-medium", palette, className)}>
      {label}
    </Badge>
  );
}
