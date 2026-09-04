"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { NEEDS, type Need } from "@/lib/journal/constants";
import type { JournalUiCopy } from "@/lib/i18n/journal-ui";

interface NeedsChecklistProps {
  values: Need[];
  onChange: (next: Need[]) => void;
  cardinality: "exactly-one" | "one-to-two";
  copy: JournalUiCopy;
  errorMessage?: string;
  disabled?: boolean;
}

export function NeedsChecklist({
  values,
  onChange,
  cardinality,
  copy,
  errorMessage,
  disabled,
}: NeedsChecklistProps) {
  const labelText =
    cardinality === "exactly-one"
      ? copy.labelNeedsExactlyOne
      : copy.labelNeedsOneToTwo;

  const toggle = (need: Need) => {
    const isSelected = values.includes(need);
    if (isSelected) {
      onChange(values.filter((n) => n !== need));
      return;
    }
    if (cardinality === "exactly-one") {
      onChange([need]);
      return;
    }
    // one-to-two: keep at most 2; drop the oldest if already at cap.
    if (values.length >= 2) {
      onChange([values[1], need]);
      return;
    }
    onChange([...values, need]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {labelText}
        <span className="ml-1 text-destructive">{copy.requiredMark}</span>
      </Label>
      <div
        role="group"
        aria-label={labelText}
        className="grid grid-cols-2 gap-2 sm:grid-cols-5"
      >
        {NEEDS.map((need) => {
          const active = values.includes(need);
          return (
            <button
              key={need}
              type="button"
              role="checkbox"
              aria-checked={active}
              disabled={disabled}
              onClick={() => toggle(need)}
              className={cn(
                "min-h-11 rounded-xl border px-3 py-2 text-sm transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border/75 bg-card/50 text-muted-foreground hover:bg-card/75",
              )}
            >
              {copy.needName[need]}
            </button>
          );
        })}
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((n) => (
            <Badge key={n} variant="secondary">
              {copy.needName[n]}
            </Badge>
          ))}
        </div>
      )}
      {errorMessage && (
        <p role="alert" className="text-xs text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
