"use client";

import {
  ArrowRight,
  CheckCircle2,
  Map as MapIcon,
  Plus,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";

/**
 * Post-save step. Surfaces the AI's suggested next actions as *informational*
 * chips, and offers real, working entry points into existing flows. None of
 * these auto-execute a cross-module write — "Activate" opens the existing
 * confirm-first Activate modal; "Open details" opens the Detail Hub where the
 * destination brief / trip plan / reframe live.
 */
export function DreamNextActionsStep({
  savedItem,
  suggestions,
  copy,
  onOpenDetails,
  onActivate,
  onViewMap,
  onAddAnother,
  onDone,
}: {
  savedItem: BucketItem;
  suggestions: string[];
  copy: BucketListUiCopy;
  onOpenDetails: () => void;
  onActivate: () => void;
  onViewMap: () => void;
  onAddAnother: () => void;
  onDone: () => void;
}) {
  return (
    <div className="space-y-5 py-2">
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="h-8 w-8 text-lime-500" />
        <p className="text-base font-medium">{copy.aiSavedTitle}</p>
        <p className="text-sm text-muted-foreground">{savedItem.title}</p>
      </div>

      {suggestions.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-lime-500" />
            {copy.aiSuggestionsLabel}
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {suggestions.slice(0, 4).map((s) => (
              <li key={s} className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-500" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">{copy.aiSavedSubtitle}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="justify-start"
            onClick={onOpenDetails}
          >
            <Wand2 className="h-4 w-4" />
            {copy.aiNextOpenDetails}
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={onActivate}
          >
            <ArrowRight className="h-4 w-4" />
            {copy.aiNextActivate}
          </Button>
          {savedItem.type === "travel" ? (
            <Button
              variant="outline"
              className="justify-start"
              onClick={onViewMap}
            >
              <MapIcon className="h-4 w-4" />
              {copy.aiNextViewMap}
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="justify-start"
            onClick={onAddAnother}
          >
            <Plus className="h-4 w-4" />
            {copy.aiNextAddAnother}
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-lime-400 text-black hover:bg-lime-300"
          onClick={onDone}
        >
          {copy.aiNextDone}
        </Button>
      </div>
    </div>
  );
}
