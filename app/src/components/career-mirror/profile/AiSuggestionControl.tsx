"use client";

import * as React from "react";
import { Check, Pencil, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/app-store";
import { getCareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import { cn } from "@/lib/utils";

export type AiSuggestionControlProps = {
  label: string;
  suggestion: string;
  currentValue?: string;
  onAccept: (value: string) => void;
  onReject?: () => void;
  multiline?: boolean;
  className?: string;
};

/**
 * Generic Accept / Edit / Reject control for an AI-generated draft. It NEVER
 * auto-commits: the parent only persists when `onAccept` fires. Editing reveals
 * an inline field pre-filled with the suggestion; Reject hides the control.
 */
export function AiSuggestionControl({
  label,
  suggestion,
  currentValue,
  onAccept,
  onReject,
  multiline = false,
  className,
}: AiSuggestionControlProps) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerMirrorUiCopy(language).aiSuggestion;

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(suggestion);
  const [resolution, setResolution] = React.useState<
    "accepted" | "rejected" | null
  >(null);

  if (!suggestion.trim()) return null;

  if (resolution === "rejected") return null;

  const handleAccept = () => {
    onAccept(editing ? draft.trim() : suggestion.trim());
    setEditing(false);
    setResolution("accepted");
  };

  const handleReject = () => {
    setEditing(false);
    setResolution("rejected");
    onReject?.();
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--accent-pink)]/25 bg-[var(--accent-pink)]/5 p-3.5",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-pink)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--accent-pink)]">
          <Sparkles className="size-3" /> {copy.badge}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {resolution === "accepted" ? (
          <span className="ml-auto text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
            {copy.accepted}
          </span>
        ) : null}
      </div>

      {editing ? (
        multiline ? (
          <Textarea
            className="mt-2.5"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={label}
          />
        ) : (
          <Input
            className="mt-2.5"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={label}
          />
        )
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {suggestion}
        </p>
      )}

      {currentValue && currentValue.trim() && !editing ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {copy.helper}
        </p>
      ) : null}

      {resolution !== "accepted" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="gradient-pink" onClick={handleAccept}>
            <Check className="size-3.5" /> {copy.accept}
          </Button>
          {!editing ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft(suggestion);
                setEditing(true);
              }}
            >
              <Pencil className="size-3.5" /> {copy.edit}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              {copy.edit}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleReject}>
            <X className="size-3.5" /> {copy.reject}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
