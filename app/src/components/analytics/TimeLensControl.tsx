"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Bookmark,
  CalendarRange,
  Check,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  OSControl,
  OSDialogSurface,
  OSPrimaryAction,
  OSStatusRail,
} from "@/components/ui/os-primitives";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ANALYTICS_RANGE_OPTIONS,
  DEFAULT_ANALYTICS_RANGE_SELECTION,
  getAnalyticsDateRange,
  validateAnalyticsDateRange,
} from "@/lib/analytics/date-range";
import type {
  AnalyticsPresetRangeKey,
  AnalyticsRangeSelection,
  AnalyticsRangeValidationError,
} from "@/lib/analytics/types";
import {
  useAnalyticsRangePresets,
  useCreateAnalyticsRangePreset,
  useDeleteAnalyticsRangePreset,
  useMarkAnalyticsRangePresetUsed,
  useUpdateAnalyticsRangePreset,
} from "@/hooks/use-analytics-range-presets";
import { cn } from "@/lib/utils";
import type { AnalyticsRangePreset } from "@/types/database";

type TimeLensControlProps = {
  value: AnalyticsRangeSelection;
  onChange: (value: AnalyticsRangeSelection) => void;
  compact?: boolean;
};

type DialogState =
  | { mode: "create"; startISO: string; endISO: string }
  | { mode: "edit"; preset: AnalyticsRangePreset };

type DraftState = {
  name: string;
  startISO: string;
  endISO: string;
};

const TODAY_ISO = format(new Date(), "yyyy-MM-dd");

function validationMessage(error: AnalyticsRangeValidationError): string {
  switch (error) {
    case "missing":
      return "Choose both a start and end date.";
    case "invalid":
      return "Use valid calendar dates.";
    case "future_end":
      return "The end date cannot be in the future.";
    case "start_after_end":
      return "Start date must be before or equal to the end date.";
    case "too_long":
      return "Custom ranges can be up to 10 years long.";
  }
}

function selectionFromPreset(preset: AnalyticsRangePreset): AnalyticsRangeSelection {
  return {
    source: "saved",
    presetId: preset.id,
    name: preset.name,
    startISO: preset.start_date,
    endISO: preset.end_date,
  };
}

function dateLine(preset: AnalyticsRangePreset): string {
  return `${preset.start_date} to ${preset.end_date}`;
}

export function TimeLensControl({ value, onChange, compact }: TimeLensControlProps) {
  const presets = useAnalyticsRangePresets();
  const createPreset = useCreateAnalyticsRangePreset();
  const updatePreset = useUpdateAnalyticsRangePreset();
  const deletePreset = useDeleteAnalyticsRangePreset();
  const markUsed = useMarkAnalyticsRangePresetUsed();
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [draft, setDraft] = useState<DraftState>({
    name: "",
    startISO: TODAY_ISO,
    endISO: TODAY_ISO,
  });

  const activePresetValue = value.source === "preset" ? value.key : null;
  const resolvedRange = useMemo(() => getAnalyticsDateRange(value), [value]);

  const validation = useMemo(
    () => validateAnalyticsDateRange(draft.startISO, draft.endISO),
    [draft.startISO, draft.endISO],
  );
  const trimmedName = draft.name.trim();
  const isSaving = createPreset.isPending || updatePreset.isPending;

  const items = ANALYTICS_RANGE_OPTIONS.map((option) => ({
    id: option.key,
    label: option.label,
    title: option.behavior,
  }));

  function openCreateDialog() {
    setDraft({
      name: "",
      startISO: resolvedRange.startISO,
      endISO: resolvedRange.endISO,
    });
    setDialogState({
      mode: "create",
      startISO: resolvedRange.startISO,
      endISO: resolvedRange.endISO,
    });
  }

  function openEditDialog(preset: AnalyticsRangePreset) {
    setDraft({
      name: preset.name,
      startISO: preset.start_date,
      endISO: preset.end_date,
    });
    setDialogState({ mode: "edit", preset });
  }

  function applySaved(preset: AnalyticsRangePreset) {
    onChange(selectionFromPreset(preset));
    markUsed.mutate(preset.id);
  }

  function handleApplyOnce() {
    if (!validation.ok) return;
    onChange({
      source: "custom",
      startISO: validation.startISO,
      endISO: validation.endISO,
      label: "Custom",
    });
    setDialogState(null);
  }

  async function handleSaveAndApply() {
    if (!validation.ok || !trimmedName) return;
    try {
      if (dialogState?.mode === "edit") {
        const saved = await updatePreset.mutateAsync({
          id: dialogState.preset.id,
          input: {
            name: trimmedName,
            startISO: validation.startISO,
            endISO: validation.endISO,
          },
        });
        onChange(selectionFromPreset(saved));
        markUsed.mutate(saved.id);
        setDialogState(null);
        return;
      }

      const saved = await createPreset.mutateAsync({
        name: trimmedName,
        startISO: validation.startISO,
        endISO: validation.endISO,
      });
      onChange(selectionFromPreset(saved));
      markUsed.mutate(saved.id);
      setDialogState(null);
    } catch {
      // Mutation hooks surface the toast; keep the dialog open for correction.
    }
  }

  function handleDelete(preset: AnalyticsRangePreset) {
    deletePreset.mutate(preset.id, {
      onSuccess: () => {
        if (value.source === "saved" && value.presetId === preset.id) {
          onChange(DEFAULT_ANALYTICS_RANGE_SELECTION);
        }
      },
    });
  }

  return (
    <>
      <div className={cn("flex w-full max-w-full flex-col items-stretch gap-2", compact ? "sm:w-fit" : "lg:items-end")}>
        <OSStatusRail<AnalyticsPresetRangeKey>
          items={items}
          value={activePresetValue}
          onValueChange={(key) => onChange({ source: "preset", key })}
          ariaLabel="Analytics range"
          className={cn("max-w-full", compact ? "sm:w-fit" : "lg:max-w-[44rem]")}
          layoutId="analytics-time-lens-active"
        />
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <OSControl
            type="button"
            osSize="compact"
            className={cn(
              "gap-1.5",
              value.source === "custom" &&
                "bg-lime-300 text-slate-950 hover:bg-lime-300 dark:text-slate-950",
            )}
            onClick={openCreateDialog}
          >
            <CalendarRange className="size-3.5" />
            Custom
          </OSControl>

          <Popover>
            <PopoverTrigger
              render={
                <OSControl
                  type="button"
                  osSize="compact"
                  className={cn(
                    "gap-1.5",
                    value.source === "saved" &&
                      "bg-lime-300 text-slate-950 hover:bg-lime-300 dark:text-slate-950",
                  )}
                />
              }
            >
              <Bookmark className="size-3.5" />
              Saved
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(calc(100vw-2rem),360px)] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Saved ranges</p>
                  <p className="text-xs text-muted-foreground">Fixed custom lenses.</p>
                </div>
                {presets.isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              </div>

              {presets.isError ? (
                <p className="rounded-lg border border-amber-500/25 bg-amber-500/8 p-3 text-xs text-amber-900 dark:text-amber-200">
                  Saved ranges are unavailable. The migration may not be applied yet.
                </p>
              ) : null}

              {!presets.isLoading && !presets.isError && (presets.data?.length ?? 0) === 0 ? (
                <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                  No saved ranges yet.
                </p>
              ) : null}

              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {(presets.data ?? []).map((preset) => {
                  const active = value.source === "saved" && value.presetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={cn(
                        "flex min-w-0 items-center gap-2 rounded-lg border border-transparent p-2",
                        active && "border-lime-300/50 bg-lime-300/12",
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => applySaved(preset)}
                      >
                        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                          {active ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                          <span className="truncate">{preset.name}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {dateLine(preset)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        aria-label={`Edit ${preset.name}`}
                        onClick={() => openEditDialog(preset)}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${preset.name}`}
                        onClick={() => handleDelete(preset)}
                        disabled={deletePreset.isPending}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Dialog
        open={dialogState != null}
        onOpenChange={(open) => {
          if (!open && !isSaving) setDialogState(null);
        }}
      >
        <OSDialogSurface size="md">
          <DialogHeader>
            <DialogTitle>
              {dialogState?.mode === "edit" ? "Edit saved range" : "Custom range"}
            </DialogTitle>
            <DialogDescription>
              Choose a fixed date window ending today or earlier, up to 10 years.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="analytics-range-name">Name</Label>
              <Input
                id="analytics-range-name"
                value={draft.name}
                maxLength={48}
                placeholder="Quarter review"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="analytics-range-start">Start</Label>
                <Input
                  id="analytics-range-start"
                  type="date"
                  value={draft.startISO}
                  max={draft.endISO || TODAY_ISO}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, startISO: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="analytics-range-end">End</Label>
                <Input
                  id="analytics-range-end"
                  type="date"
                  value={draft.endISO}
                  min={draft.startISO}
                  max={TODAY_ISO}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, endISO: event.target.value }))
                  }
                />
              </div>
            </div>
            {!validation.ok ? (
              <p className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                {validationMessage(validation.error)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {validation.days} day{validation.days === 1 ? "" : "s"} selected.
              </p>
            )}
          </div>

          <DialogFooter>
            <OSControl type="button" osSize="compact" onClick={() => setDialogState(null)}>
              Cancel
            </OSControl>
            {dialogState?.mode !== "edit" ? (
              <OSControl
                type="button"
                osSize="compact"
                disabled={!validation.ok}
                onClick={handleApplyOnce}
              >
                Apply once
              </OSControl>
            ) : null}
            <OSPrimaryAction
              type="button"
              osSize="compact"
              disabled={!validation.ok || !trimmedName || isSaving}
              onClick={() => void handleSaveAndApply()}
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {dialogState?.mode === "edit" ? "Update & apply" : "Save & apply"}
            </OSPrimaryAction>
          </DialogFooter>
        </OSDialogSurface>
      </Dialog>
    </>
  );
}
