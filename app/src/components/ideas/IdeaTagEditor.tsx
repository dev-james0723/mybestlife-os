"use client";

import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";

function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 48);
}

export function IdeaTagEditor({
  manualTags,
  aiTags,
  onChangeManual,
  onRemoveAiTag,
  disabled,
  language,
  className,
}: {
  manualTags: string[];
  aiTags: string[];
  onChangeManual: (next: string[]) => void;
  onRemoveAiTag?: (tag: string) => void;
  disabled?: boolean;
  language: AppLocale;
  className?: string;
}) {
  const ui = getIdeasUiCopy(language);
  const [draft, setDraft] = useState("");

  const addManual = useCallback(() => {
    const t = normalizeTag(draft);
    if (!t || manualTags.includes(t)) return;
    onChangeManual([...manualTags, t]);
    setDraft("");
  }, [draft, manualTags, onChangeManual]);

  const removeManual = useCallback(
    (tag: string) => {
      onChangeManual(manualTags.filter((x) => x !== tag));
    },
    [manualTags, onChangeManual],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{ui.manualTags}</p>
        <div className="flex flex-wrap gap-1.5">
          {manualTags.map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="gap-1 pr-1 text-[11px] font-normal"
            >
              {t}
              {!disabled ? (
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-muted"
                  onClick={() => removeManual(t)}
                  aria-label={`Remove ${t}`}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </Badge>
          ))}
          {manualTags.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : null}
        </div>
        {!disabled ? (
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addManual();
                }
              }}
              placeholder={ui.addTagPlaceholder}
              className="h-9 text-sm"
            />
            <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={addManual}>
              {ui.addTag}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{ui.aiTags}</p>
        <div className="flex flex-wrap gap-1.5">
          {aiTags.map((t) => (
            <Badge key={t} variant="outline" className="gap-1 pr-1 text-[11px] font-normal">
              {t}
              {!disabled && onRemoveAiTag ? (
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-muted"
                  onClick={() => onRemoveAiTag(t)}
                  aria-label={ui.removeAiTag}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </Badge>
          ))}
          {aiTags.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
