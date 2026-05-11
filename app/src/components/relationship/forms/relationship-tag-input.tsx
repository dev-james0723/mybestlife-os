"use client";

/**
 * Tag input for the Relationship form.
 *
 * UX:
 *  - Type free text, press Enter or "," to commit a tag chip.
 *  - Backspace on empty input removes the last chip (standard chip-input
 *    convention; users discover it without explicit affordance).
 *  - Click the X on a chip to remove it directly.
 *  - Pasting a comma-separated string commits each value as a chip.
 *
 * The component is fully controlled — it owns no tag list, only the
 * draft text in the input. The parent passes `value: string[]` and
 * receives `onChange(string[])`.
 */

import { useCallback, useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseTagsInput } from "@/types/relationship";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Maximum visual length per tag — prevents pathological huge chips. */
  maxTagLength?: number;
};

export function RelationshipTagInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  maxTagLength = 40,
}: Props) {
  const [draft, setDraft] = useState("");

  const commit = useCallback(
    (raw: string) => {
      const incoming = parseTagsInput(raw)
        .map((t) => t.slice(0, maxTagLength))
        .filter((t) => !value.includes(t));
      if (incoming.length === 0) return;
      onChange([...value, ...incoming]);
    },
    [value, onChange, maxTagLength],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim().length > 0) {
        commit(draft);
        setDraft("");
      }
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text.includes(",")) {
      e.preventDefault();
      commit(text);
      setDraft("");
    }
  };

  const removeTag = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
      )}
    >
      {value.map((tag, idx) => (
        <Badge
          key={`${tag}-${idx}`}
          variant="secondary"
          className="gap-1 pr-1 font-normal"
        >
          <span className="max-w-[160px] truncate">{tag}</span>
          <button
            type="button"
            onClick={() => removeTag(idx)}
            aria-label={`Remove ${tag}`}
            className="-mr-1 inline-flex h-4 w-4 items-center justify-center rounded-sm hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (draft.trim().length > 0) {
            commit(draft);
            setDraft("");
          }
        }}
        placeholder={value.length === 0 ? placeholder : undefined}
        aria-label={ariaLabel}
        className="h-7 min-w-[120px] flex-1 border-0 bg-transparent p-0 px-1 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
