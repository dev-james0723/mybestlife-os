"use client";

import { useMemo, useState } from "react";
import { useIdeasStore } from "@/stores/ideas-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { ideaTags } from "@/lib/ideas/idea-helpers";
import { Search } from "lucide-react";

function tagCounts(
  items: { manual_tags: string[]; ai_tags: string[] }[],
): Array<[string, number]> {
  const tags = new Map<string, { label: string; count: number }>();
  for (const it of items) {
    for (const tag of ideaTags(it)) {
      const key = tag.toLocaleLowerCase();
      const current = tags.get(key);
      if (current) {
        current.count += 1;
      } else {
        tags.set(key, { label: tag, count: 1 });
      }
    }
  }
  return [...tags.values()]
    .map(({ label, count }) => [label, count] as [string, number])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function activeTagValue(token: string | null): string | null {
  if (!token) return null;
  const [kind, ...rest] = token.split(":");
  if (kind !== "tag" && kind !== "ai" && kind !== "manual") return null;
  return rest.join(":");
}

export function IdeasTagTaxonomyPanel({
  onAfterSelect,
  className,
}: {
  onAfterSelect?: () => void;
  className?: string;
}) {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const items = useIdeasStore((s) => s.items);
  const activeTagToken = useIdeasStore((s) => s.activeTagToken);
  const setActiveTagToken = useIdeasStore((s) => s.setActiveTagToken);
  const [tagQuery, setTagQuery] = useState("");

  const allTags = useMemo(() => tagCounts(items), [items]);
  const normalizedQuery = tagQuery.trim().toLocaleLowerCase();
  const visibleTags = useMemo(
    () =>
      normalizedQuery
        ? allTags.filter(([tag]) => tag.toLocaleLowerCase().includes(normalizedQuery))
        : allTags,
    [allTags, normalizedQuery],
  );
  const selectedTag = activeTagValue(activeTagToken);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            placeholder={ui.tagSearchPlaceholder}
            className="h-8 border-border/60 bg-background/70 pl-8 text-xs"
            aria-label={ui.tagSearchPlaceholder}
          />
        </div>
        {allTags.length === 0 ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : visibleTags.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">{ui.noTagsFound}</p>
        ) : (
          <ScrollArea className="max-h-72 pr-2">
            <div className="space-y-0.5">
              {visibleTags.map(([tag, count]) => {
                const token = `tag:${tag}`;
                const active = selectedTag === tag;
                return (
                  <button
                    key={token}
                    type="button"
                    aria-pressed={active}
                    data-selection-glow={active ? "active" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs hover:bg-accent",
                      active && "bg-accent font-medium",
                    )}
                    onClick={() => {
                      setActiveTagToken(active ? null : token);
                      onAfterSelect?.();
                    }}
                  >
                    <span className="truncate">{tag}</span>
                    <span className="tabular-nums text-[10px] text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {activeTagToken ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setActiveTagToken(null);
              onAfterSelect?.();
            }}
          >
            {ui.clearFilters}
          </Button>
        </>
      ) : null}
    </div>
  );
}
