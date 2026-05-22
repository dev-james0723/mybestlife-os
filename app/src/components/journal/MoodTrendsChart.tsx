"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import type { JournalUiCopy } from "@/lib/i18n/journal-ui";
import type { JournalEntry } from "@/types/database";

const MIN_ENTRIES_FOR_CHART = 3;

const ChartInner = dynamic(() => import("./MoodTrendsChartInner"), {
  ssr: false,
  loading: () => (
    <div className="h-56 w-full animate-pulse rounded-md bg-muted/50" />
  ),
});

interface MoodTrendsChartProps {
  entries: JournalEntry[];
  copy: JournalUiCopy;
}

export function MoodTrendsChart({ entries, copy }: MoodTrendsChartProps) {
  const [open, setOpen] = useState(false);
  const [rangeDays, setRangeDays] = useState<7 | 14>(7);

  if (entries.length < MIN_ENTRIES_FOR_CHART) {
    return <p className="text-sm text-muted-foreground">{copy.trendsEmpty}</p>;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          />
        }
      >
        <span>{open ? "Hide trends" : "Show trends"}</span>
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 pt-3">
        <div
          role="group"
          aria-label="Time range"
          className="inline-flex rounded-md border border-border bg-background p-0.5"
        >
          <Button
            type="button"
            variant={rangeDays === 7 ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setRangeDays(7)}
          >
            {copy.trendsRange7}
          </Button>
          <Button
            type="button"
            variant={rangeDays === 14 ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setRangeDays(14)}
          >
            {copy.trendsRange14}
          </Button>
        </div>

        {open && (
          <ChartInner entries={entries} rangeDays={rangeDays} copy={copy} />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
