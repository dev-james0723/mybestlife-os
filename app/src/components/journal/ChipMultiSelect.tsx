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
}: ChipMultiSelectProps) {
  const [draft, setDraft] = useState("");

  const toggle = (v: string) => {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      onChange([...values, v]);
    }
  };

  const commitDraft = () => {
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
              onClick={() => toggle(opt)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
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
            className="gap-1 rounded-full px-2.5 py-1"
          >
            {v}
            <button
              type="button"
              onClick={() => toggle(v)}
              aria-label={`Remove ${v}`}
              className="-mr-0.5 text-muted-foreground hover:text-foreground"
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
          className="h-7 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={commitDraft}
          disabled={!draft.trim()}
        >
          <Plus aria-hidden />
          Add
        </Button>
      </div>
    </div>
  );
}
