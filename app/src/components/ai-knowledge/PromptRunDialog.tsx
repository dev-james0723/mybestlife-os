"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import { effectiveVariableSpecs } from "@/lib/ai/interpolate-prompt-body";
import { usePromptStore } from "@/stores/prompt-store";
import type { CustomPrompt, LibraryPrompt } from "@/types/prompt";

type AnyPrompt = LibraryPrompt | CustomPrompt;

interface PromptRunDialogProps {
  prompt: AnyPrompt | null;
  /** When opening for a re-run, seed variable fields from a prior execution. */
  initialVariables?: Record<string, string>;
  /** Optional Ask My Knowledge Base retrieval run whose knowledge should ground the prompt. */
  retrievalRunId?: string | null;
  onClose: () => void;
}

export function PromptRunDialog({
  prompt,
  initialVariables,
  retrievalRunId,
  onClose,
}: PromptRunDialogProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);
  const fetchRecentRuns = usePromptStore((s) => s.fetchRecentRuns);
  const fetchUserPrompts = usePromptStore((s) => s.fetchUserPrompts);

  const open = prompt !== null;

  const specs = useMemo(
    () =>
      prompt
        ? effectiveVariableSpecs(prompt.variables, prompt.body)
        : [],
    [prompt],
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [resultText, setResultText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!prompt) {
      setValues({});
      setResultText(null);
      setIsSubmitting(false);
      return;
    }
    const next: Record<string, string> = {};
    const s = effectiveVariableSpecs(prompt.variables, prompt.body);
    for (const v of s) {
      next[v.name] = v.example ?? "";
    }
    if (initialVariables) {
      for (const name of Object.keys(next)) {
        if (initialVariables[name] !== undefined) {
          next[name] = initialVariables[name]!;
        }
      }
    }
    setValues(next);
    setResultText(null);
  }, [prompt, initialVariables]);

  const handleSubmit = useCallback(async () => {
    if (!prompt) return;
    setIsSubmitting(true);
    setResultText(null);
    try {
      const res = await fetch("/api/ai/knowledge/prompt-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: language,
          libraryPromptId:
            prompt.source === "library" ? prompt.id : undefined,
          customPromptId:
            prompt.source === "custom" ? prompt.id : undefined,
          retrievalRunId: retrievalRunId ?? undefined,
          variables: values,
        }),
      });
      const data = (await res.json()) as {
        resultText?: string;
        error?: string;
        missing?: string[];
        message?: string;
      };
      if (!res.ok) {
        if (data.error === "missing_variables" && Array.isArray(data.missing)) {
          toast.error(
            `${ui.toast.runFailed} (${data.missing.map((m) => `{${m}}`).join(", ")})`,
          );
        } else {
          toast.error(data.message ?? ui.toast.runFailed);
        }
        return;
      }
      setResultText(data.resultText ?? "");
      toast.success(ui.toast.runSuccess);
      await fetchRecentRuns(50).catch(() => {});
      if (prompt.source === "custom") {
        await fetchUserPrompts().catch(() => {});
      }
    } catch {
      toast.error(ui.toast.runFailed);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    prompt,
    values,
    language,
    ui.toast,
    fetchRecentRuns,
    fetchUserPrompts,
    retrievalRunId,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent size="4xl" className="max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{ui.run.title}</DialogTitle>
          <DialogDescription>{ui.run.description}</DialogDescription>
          {retrievalRunId ? (
            <div className="pt-2">
              <Badge variant="outline" className="w-fit text-[11px]">
                Use current Ask My Knowledge Base knowledge
              </Badge>
            </div>
          ) : null}
        </DialogHeader>

        {prompt && (
          <div className="flex flex-col min-h-0 flex-1">
            <ScrollArea className="max-h-[min(60vh,520px)] px-6">
              <div className="space-y-4 py-4">
                {specs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{ui.run.noVariables}</p>
                ) : (
                  specs.map((v) => (
                    <div key={v.name} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`var-${v.name}`} className="text-sm">
                          {v.label ?? v.name}
                        </Label>
                        <Badge variant="outline" className="text-[10px]">
                          {v.required
                            ? ui.run.requiredTag
                            : ui.run.optionalTag}
                        </Badge>
                      </div>
                      {v.description && (
                        <p className="text-xs text-muted-foreground">
                          {v.description}
                        </p>
                      )}
                      <Input
                        id={`var-${v.name}`}
                        value={values[v.name] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [v.name]: e.target.value,
                          }))
                        }
                        placeholder={ui.run.variableHint(v.name)}
                        disabled={isSubmitting}
                      />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="border-t px-6 py-3 flex items-center justify-between gap-2 shrink-0 bg-muted/20">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                {ui.run.close}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {ui.run.submitting}
                  </>
                ) : (
                  ui.run.submit
                )}
              </Button>
            </div>

            {resultText !== null && (
              <div className="border-t px-6 py-4 space-y-2 shrink-0 bg-card">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {ui.run.result}
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(resultText);
                        toast.success(ui.toast.copyBodySuccess);
                      } catch {
                        toast.error(ui.toast.copyBodyFailed);
                      }
                    }}
                  >
                    {ui.run.copyResult}
                  </Button>
                </div>
                <Textarea
                  readOnly
                  value={resultText}
                  className="min-h-[200px] max-h-[280px] font-mono text-xs"
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
