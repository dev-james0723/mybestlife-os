"use client";

import { useState } from "react";
import { AlertTriangle, Copy, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { AICoachCopy } from "@/lib/i18n/ai-coach-ui";
import type { CompiledPromptMeta } from "@/types/ai-coach";
import { copyToClipboard } from "@/lib/ai/clipboard";
import { toast } from "sonner";

interface Props {
  copy: AICoachCopy;
  text: string;
  meta: CompiledPromptMeta;
  missingVariables: string[];
  onEditedText: (next: string) => void;
  hideNextTime: boolean;
  onToggleHideNextTime: (v: boolean) => void;
}

export function PreviewStep({
  copy,
  text,
  meta,
  missingVariables,
  onEditedText,
  hideNextTime,
  onToggleHideNextTime,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  if (!editing && draft !== text) setDraft(text);

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) toast.success(copy.toast.promptCopiedGeneric);
    else toast.error(copy.toast.copyFailed);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{copy.flow.preview.title}</h2>
          <p className="text-sm text-muted-foreground">
            {copy.flow.preview.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="mr-1 h-4 w-4" />
            {copy.flow.preview.copy}
          </Button>
          {editing ? (
            <Button
              size="sm"
              onClick={() => {
                onEditedText(draft);
                setEditing(false);
              }}
            >
              {copy.flow.preview.finish}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="mr-1 h-4 w-4" />
              {copy.flow.preview.edit}
            </Button>
          )}
        </div>
      </div>

      {missingVariables.length > 0 ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Unfilled variables:
            </p>
            <p className="text-amber-800/80 dark:text-amber-200/80">
              {missingVariables.map((v) => `[${v}]`).join(", ")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-normal">
          {copy.flow.aiTool.charCount(meta.chars)}
        </Badge>
        <Badge variant="outline" className="font-normal">
          {copy.flow.aiTool.estimatedTokens(meta.approxTokens)}
        </Badge>
      </div>

      {editing ? (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={16}
          className="font-mono text-sm"
        />
      ) : (
        <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 font-mono text-xs leading-relaxed">
          {text}
        </pre>
      )}

      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <Checkbox
          checked={hideNextTime}
          onCheckedChange={(v) => onToggleHideNextTime(v === true)}
        />
        {copy.flow.preview.hideToggle}
      </label>
    </div>
  );
}
