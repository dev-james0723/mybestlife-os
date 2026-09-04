"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChipMultiSelectProps {
  label: string;
  /** Preset options that are always rendered as chips. */
  options: readonly string[];
  /** Currently selected values (subset of options ∪ custom values). */
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

/**
 * Multi-select chip group with a free-text "add" input for custom values.
 * Pressing Enter in the input commits the value. Selected items render with
 * a remove button.
 */
export function ChipMultiSelect({
  label,
  options,
  values,
  onChange,
  disabled,
}: ChipMultiSelectProps) {
  const [draft, setDraft] = useState("");

  const toggle = (v: string) => {
    if (disabled) return;
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      onChange([...values, v]);
    }
  };

  const commitDraft = () => {
    if (disabled) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft();
    }
  };

  const customValues = values.filter((v) => !options.includes(v));

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              role="checkbox"
              aria-checked={active}
              disabled={disabled}
              onClick={() => toggle(opt)}
              className={cn(
                "min-h-11 rounded-xl border px-2.5 py-1 text-xs transition-colors outline-none sm:min-h-9",
                "focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border/75 bg-card/50 text-muted-foreground hover:bg-card/75",
              )}
            >
              {opt}
            </button>
          );
        })}
        {customValues.map((v) => (
          <Badge
            key={v}
            variant="secondary"
            className="gap-1 rounded-xl px-2.5 py-1"
          >
            {v}
            <button
              type="button"
              onClick={() => toggle(v)}
              disabled={disabled}
              aria-label={`Remove ${v}`}
              className="-mr-1 inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:-mr-0.5 sm:min-h-6 sm:min-w-6"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="Add custom…"
          disabled={disabled}
          className="h-11 text-xs sm:h-9"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={commitDraft}
          disabled={disabled || !draft.trim()}
          className="min-h-11 sm:min-h-9"
        >
          <Plus aria-hidden />
          Add
        </Button>
      </div>
    </div>
  );
}
