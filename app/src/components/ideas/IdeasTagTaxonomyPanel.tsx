"use client";

import { useMemo } from "react";
import { useIdeasStore } from "@/stores/ideas-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";

function tagCounts(
  items: { manual_tags: string[]; ai_tags: string[] }[],
): { manual: Map<string, number>; ai: Map<string, number> } {
  const manual = new Map<string, number>();
  const ai = new Map<string, number>();
  for (const it of items) {
    for (const t of it.manual_tags ?? []) {
      const k = t.trim();
      if (!k) continue;
      manual.set(k, (manual.get(k) ?? 0) + 1);
    }
    for (const t of it.ai_tags ?? []) {
      const k = t.trim();
      if (!k) continue;
      ai.set(k, (ai.get(k) ?? 0) + 1);
    }
  }
  return { manual, ai };
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

  const { manual, ai } = useMemo(() => tagCounts(items), [items]);
  const manualList = useMemo(
    () => [...manual.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    [manual],
  );
  const aiList = useMemo(
    () => [...ai.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    [ai],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {ui.manualTags}
        </p>
        {manualList.length === 0 ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : (
          <ScrollArea className="max-h-36 pr-2">
            <div className="space-y-0.5">
              {manualList.map(([tag, count]) => {
                const token = `manual:${tag}`;
                const active = activeTagToken === token;
                return (
                  <button
                    key={token}
                    type="button"
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

      <Separator />

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {ui.aiTags}
        </p>
        {aiList.length === 0 ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : (
          <ScrollArea className="max-h-36 pr-2">
            <div className="space-y-0.5">
              {aiList.map(([tag, count]) => {
                const token = `ai:${tag}`;
                const active = activeTagToken === token;
                return (
                  <button
                    key={token}
                    type="button"
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
          <Separator />
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
