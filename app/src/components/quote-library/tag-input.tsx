"use client";

import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
  maxTags?: number;
  maxTagLength?: number;
  className?: string;
  removeAriaLabel?: (tag: string) => string;
}

export function TagInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  maxTags = 20,
  maxTagLength = 40,
  className,
  removeAriaLabel = (tag) => `Remove ${tag}`,
}: TagInputProps) {
  const [draft, setDraft] = useState("");

  const normalized = useMemo(
    () => new Set(value.map((t) => t.toLowerCase())),
    [value],
  );

  const commit = useCallback(() => {
    const next = draft.trim().slice(0, maxTagLength);
    if (!next) return;
    if (normalized.has(next.toLowerCase())) {
      setDraft("");
      return;
    }
    if (value.length >= maxTags) {
      setDraft("");
      return;
    }
    onChange([...value, next]);
    setDraft("");
  }, [draft, maxTagLength, maxTags, normalized, onChange, value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const remove = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div
      className={cn(
        "flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-xl border border-input bg-transparent px-2 py-1.5 text-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        className,
      )}
      onClick={(e) => {
        const target = e.currentTarget.querySelector("input");
        target?.focus();
      }}
      role="group"
      aria-label={ariaLabel}
    >
      {value.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-1 px-2 py-0.5 font-normal"
        >
          <span>#{tag}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              remove(tag);
            }}
            aria-label={removeAriaLabel(tag)}
            className="rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-3" aria-hidden />
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, maxTagLength))}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="h-7 min-w-[120px] flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
    </div>
  );
}
