"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, Sparkles, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getThemeUiCopy } from "@/lib/i18n/theme-ui";
import { useCreateGoal, useCreateKeyResult } from "@/hooks/use-goals";

type KRDraft = {
  _tempId: string;
  name: string;
  target_value: string;
  unit: string;
};

const newKR = (): KRDraft => ({
  _tempId: crypto.randomUUID(),
  name: "",
  target_value: "",
  unit: "",
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the goal (and any key results) saved successfully. */
  onSaved?: () => void;
};

export function CreateGoalAiDialog({ open, onOpenChange, onSaved }: Props) {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getThemeUiCopy(language), [language]);

  const createGoal = useCreateGoal();
  const createKeyResult = useCreateKeyResult();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [keyResults, setKeyResults] = useState<KRDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setName("");
    setDescription("");
    setCategory("");
    setTargetDate("");
    setKeyResults([]);
    setSaving(false);
  }, []);

  const handleClose = useCallback(
    (next: boolean) => {
      if (saving) return;
      onOpenChange(next);
      if (!next) {
        // Defer reset so exit animation completes
        setTimeout(reset, 200);
      }
    },
    [onOpenChange, reset, saving],
  );

  const addKR = useCallback(() => {
    setKeyResults((prev) => [...prev, newKR()]);
  }, []);

  const updateKR = useCallback(
    (id: string, field: keyof Omit<KRDraft, "_tempId">, value: string) => {
      setKeyResults((prev) =>
        prev.map((kr) =>
          kr._tempId === id ? { ...kr, [field]: value } : kr,
        ),
      );
    },
    [],
  );

  const removeKR = useCallback((id: string) => {
    setKeyResults((prev) => prev.filter((kr) => kr._tempId !== id));
  }, []);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      toast.error(ui.goalAiNameRequired);
      return;
    }

    setSaving(true);
    try {
      const goal = await createGoal.mutateAsync({
        name: trimmedName,
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        target_date: targetDate || undefined,
      });

      // Best-effort key-result creation: a partial failure shouldn't block.
      const validKRs = keyResults
        .map((kr) => ({
          name: kr.name.trim(),
          target_value: kr.target_value
            ? Number.parseFloat(kr.target_value)
            : undefined,
          unit: kr.unit.trim() || undefined,
        }))
        .filter((kr) => kr.name.length > 0);

      if (validKRs.length > 0) {
        await Promise.allSettled(
          validKRs.map((kr) =>
            createKeyResult.mutateAsync({
              goal_id: goal.id,
              name: kr.name,
              target_value:
                kr.target_value && Number.isFinite(kr.target_value)
                  ? kr.target_value
                  : undefined,
              unit: kr.unit,
            }),
          ),
        );
      }

      onSaved?.();
      handleClose(false);
    } catch (err) {
      console.error("[goal-ai-dialog] save failed:", err);
      toast.error(ui.goalAiCreateFailed);
      setSaving(false);
    }
  }, [
    category,
    createGoal,
    createKeyResult,
    description,
    handleClose,
    keyResults,
    name,
    onSaved,
    targetDate,
    ui,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-hidden p-0"
        showCloseButton
      >
        <div className="flex max-h-[90vh] flex-col">
          {/* Header */}
          <DialogHeader className="border-b border-border/60 bg-gradient-to-br from-primary/5 to-transparent px-5 pt-5 pb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Target className="size-4" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="flex items-center gap-1.5 text-base font-semibold">
                  {ui.goalAiDialogTitle}
                  <Sparkles
                    className="size-3.5 text-primary/70"
                    aria-hidden="true"
                  />
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {ui.goalAiDialogSubtitle}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Body — scrolls if content overflows */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="goal-ai-name" className="text-xs font-medium">
                  {ui.goalAiNameLabel}
                </Label>
                <Input
                  id="goal-ai-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={ui.goalAiNamePlaceholder}
                  autoFocus
                  className="h-10 text-sm"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="goal-ai-description"
                  className="text-xs font-medium"
                >
                  {ui.goalAiDescriptionLabel}
                </Label>
                <Textarea
                  id="goal-ai-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={ui.goalAiDescriptionPlaceholder}
                  className="min-h-[5rem] resize-none text-sm"
                />
              </div>

              {/* Category + Target date */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="goal-ai-category"
                    className="text-xs font-medium"
                  >
                    {ui.goalAiCategoryLabel}
                  </Label>
                  <Input
                    id="goal-ai-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={ui.goalAiCategoryPlaceholder}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium">
                    {ui.goalAiTargetDateLabel}
                  </Label>
                  <DatePickerInput
                    value={targetDate}
                    onChange={setTargetDate}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Key results */}
              <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-xs font-medium">
                      {ui.goalAiKeyResultsLabel}
                    </Label>
                    <span className="text-[11px] text-muted-foreground/80">
                      {ui.goalAiKeyResultsHint}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={addKR}
                  >
                    <Plus className="size-3" aria-hidden="true" />
                    {ui.goalAiAddKeyResult}
                  </Button>
                </div>

                {keyResults.length > 0 && (
                  <div className="flex flex-col gap-2 pt-1">
                    {keyResults.map((kr) => (
                      <motion.div
                        key={kr._tempId}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "grid grid-cols-1 gap-2 rounded-md border border-border/60 bg-background p-2",
                          "sm:grid-cols-[1fr_5.5rem_5.5rem_auto]",
                        )}
                      >
                        <Input
                          value={kr.name}
                          onChange={(e) =>
                            updateKR(kr._tempId, "name", e.target.value)
                          }
                          placeholder={ui.goalAiKeyResultName}
                          className="h-9 text-sm"
                        />
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={kr.target_value}
                          onChange={(e) =>
                            updateKR(
                              kr._tempId,
                              "target_value",
                              e.target.value,
                            )
                          }
                          placeholder={ui.goalAiKeyResultTarget}
                          className="h-9 text-sm"
                        />
                        <Input
                          value={kr.unit}
                          onChange={(e) =>
                            updateKR(kr._tempId, "unit", e.target.value)
                          }
                          placeholder={ui.goalAiKeyResultUnit}
                          className="h-9 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeKR(kr._tempId)}
                          aria-label="Remove"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer — DialogFooter defaults to -mx-4 for dialogs with p-4; this
              sheet uses p-0 + px-5 in body, so reset margins so actions align. */}
          <DialogFooter className="mx-0 mb-0 flex-row flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-border/60 bg-card/40 px-5 py-3 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={saving}
              className="shrink-0"
            >
              {ui.goalAiCancel}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!canSave}
              className="min-w-[7rem] shrink-0"
            >
              {saving ? (
                <>
                  <Loader2
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  {ui.goalAiSaving}
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  {ui.goalAiSave}
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
