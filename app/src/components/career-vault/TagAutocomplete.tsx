"use client";

import { useMemo, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizeTag } from "@/lib/career-vault/utils";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import { useVaultTagUsage } from "@/hooks/use-career-vault-tags";

type TagAutocompleteProps = {
  copy: CareerVaultCopy;
  value: string[];
  onChange: (next: string[]) => void;
  /** AI-suggested tags that should be visually highlighted with a sparkle. */
  aiSuggested?: string[];
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  max?: number;
};

/**
 * Chip-style tag editor with completion from the user's existing vocabulary.
 * Typing shows a panel of matching existing tags (with usage counts) plus an
 * option to create a brand-new one. Enter / comma / blur all commit the
 * current buffer as a new chip.
 */
export function TagAutocomplete({
  copy,
  value,
  onChange,
  aiSuggested,
  disabled,
  id,
  placeholder,
  max = 12,
}: TagAutocompleteProps) {
  const usageQuery = useVaultTagUsage();
  const [buffer, setBuffer] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(() => new Set(value), [value]);
  const aiSet = useMemo(() => new Set(aiSuggested ?? []), [aiSuggested]);

  const suggestions = useMemo(() => {
    const all = usageQuery.data ?? [];
    const q = normalizeTag(buffer);
    if (!q) {
      return all.filter((t) => !selected.has(t.name)).slice(0, 8);
    }
    return all
      .filter((t) => t.name.includes(q) && !selected.has(t.name))
      .slice(0, 8);
  }, [usageQuery.data, buffer, selected]);

  const canCreate = useMemo(() => {
    const norm = normalizeTag(buffer);
    if (!norm) return false;
    if (selected.has(norm)) return false;
    return !(usageQuery.data ?? []).some((t) => t.name === norm);
  }, [buffer, selected, usageQuery.data]);

  const add = (raw: string) => {
    const norm = normalizeTag(raw);
    if (!norm) return;
    if (selected.has(norm)) return;
    if (value.length >= max) return;
    onChange([...value, norm]);
    setBuffer("");
    inputRef.current?.focus();
  };

  const remove = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5",
          focused && "ring-2 ring-ring",
          disabled && "pointer-events-none opacity-60",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((t) => (
          <Badge
            key={t}
            variant="secondary"
            className="gap-1 font-normal"
          >
            {aiSet.has(t) ? (
              <Sparkles
                className="h-3 w-3 text-violet-500"
                aria-label={copy.tags.autocomplete.aiSuggested}
              />
            ) : null}
            #{t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(t);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          id={id}
          ref={inputRef}
          value={buffer}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : ""}
          onChange={(e) => setBuffer(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Let the suggestion click land first.
            window.setTimeout(() => {
              setFocused(false);
              if (buffer.trim()) add(buffer);
            }, 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(buffer);
            } else if (e.key === "Backspace" && !buffer && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          className="h-7 min-w-[10ch] flex-1 border-0 bg-transparent px-1 py-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {focused && (suggestions.length > 0 || canCreate) ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {suggestions.map((t) => (
            <button
              key={t.name}
              type="button"
              className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              onMouseDown={(e) => {
                e.preventDefault();
                add(t.name);
              }}
            >
              <span className="flex items-center gap-1">
                {aiSet.has(t.name) ? (
                  <Sparkles className="h-3 w-3 text-violet-500" />
                ) : null}
                #{t.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {copy.tags.autocomplete.usageCount(t.count)}
              </span>
            </button>
          ))}
          {canCreate ? (
            <button
              type="button"
              className="flex w-full items-center gap-1 rounded-sm px-2 py-1.5 text-left text-sm text-foreground hover:bg-accent"
              onMouseDown={(e) => {
                e.preventDefault();
                add(buffer);
              }}
            >
              {copy.tags.autocomplete.createNew(normalizeTag(buffer))}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
