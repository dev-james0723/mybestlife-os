"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { useProfile } from "@/hooks/use-settings";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import {
  MAX_KNOWLEDGE_COMMAND_LIGHT_OPACITY,
  MIN_KNOWLEDGE_COMMAND_LIGHT_OPACITY,
  knowledgeCommandLightOpacityToCssValue,
  normalizeKnowledgeCommandLightOpacity,
} from "@/lib/knowledge/command-light-preferences";
import { getCategoryLabel, getSourceTypeInfo, KNOWLEDGE_CATEGORY_ORDER } from "@/lib/knowledge/labels";
import {
  createKnowledgeQuickFilterDefinition,
  createKnowledgeQuickFilterRule,
  defaultValueForKnowledgeQuickFilterField,
  getDefaultKnowledgeQuickFilters,
  hasIncompleteKnowledgeQuickFilterDraft,
  isKnowledgeQuickFilterRuleComplete,
  KNOWLEDGE_BUILTIN_QUICK_FILTER_IDS,
  KNOWLEDGE_QUICK_FILTER_FIELDS,
  KNOWLEDGE_QUICK_FILTER_ICON_KEYS,
  KNOWLEDGE_QUICK_FILTER_PROVIDER_VALUES,
  KNOWLEDGE_QUICK_FILTER_STATUS_VALUES,
  operatorForKnowledgeQuickFilterField,
  serializeKnowledgeQuickFilters,
  type KnowledgeBuiltinQuickFilterId,
  type KnowledgeQuickFilterDefinition,
  type KnowledgeQuickFilterRule,
  type KnowledgeQuickFilterRuleField,
} from "@/lib/knowledge/quick-filters";
import { SOURCE_TYPES } from "@/types/knowledge-source";
import { CONTENT_TYPES, type ContentType } from "@/types/knowledge";
import { settingsRepository } from "@/lib/repositories/settings";
import type { UserProfile } from "@/types/database";
import { cn } from "@/lib/utils";
import { KNOWLEDGE_QUICK_FILTER_ICON_COMPONENTS } from "./knowledgeQuickFilterIcons";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function cloneDefinitions(
  defs: KnowledgeQuickFilterDefinition[],
): KnowledgeQuickFilterDefinition[] {
  return defs.map((def) => ({
    ...def,
    rules: def.rules.map((rule) => ({ ...rule })),
  }));
}

function providerLabel(provider: string): string {
  if (provider === "x") return "X";
  if (provider === "web") return "Web";
  if (provider === "youtube") return "YouTube";
  if (provider === "github") return "GitHub";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function statusLabel(status: string): string {
  if (status === "ready") return "Ready";
  if (status === "processing") return "Processing";
  if (status === "error") return "Error";
  return status;
}

function applyKnowledgeCommandLightOpacityVar(value: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    "--knowledge-command-light-user-opacity",
    knowledgeCommandLightOpacityToCssValue(value),
  );
}

export function KnowledgeQuickFiltersDialog({ open, onOpenChange }: Props) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const copy = ui.quickFilterManager;
  const queryClient = useQueryClient();
  const profile = useProfile();
  const quickFilterDefinitions = useKnowledgeStore((s) => s.quickFilterDefinitions);
  const setQuickFilterDefinitions = useKnowledgeStore((s) => s.setQuickFilterDefinitions);
  const [draft, setDraft] = useState<KnowledgeQuickFilterDefinition[]>(() =>
    cloneDefinitions(quickFilterDefinitions),
  );
  const profileCommandLightOpacity = normalizeKnowledgeCommandLightOpacity(
    profile.data?.knowledge_command_light_opacity,
  );
  const [commandLightOpacity, setCommandLightOpacity] = useState(
    profileCommandLightOpacity,
  );
  const [commandLightOpacityDirty, setCommandLightOpacityDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(cloneDefinitions(quickFilterDefinitions));
  }, [open, quickFilterDefinitions]);

  useEffect(() => {
    if (!open) {
      setCommandLightOpacityDirty(false);
      return;
    }
    if (commandLightOpacityDirty) return;
    setCommandLightOpacity(profileCommandLightOpacity);
    applyKnowledgeCommandLightOpacityVar(profileCommandLightOpacity);
  }, [commandLightOpacityDirty, open, profileCommandLightOpacity]);

  const hasIncompleteDraft = useMemo(
    () => hasIncompleteKnowledgeQuickFilterDraft(draft),
    [draft],
  );

  const saveMutation = useMutation({
    mutationFn: async (defs: KnowledgeQuickFilterDefinition[]) => {
      const next = serializeKnowledgeQuickFilters(defs);
      const saved = await settingsRepository.updateProfile({
        knowledge_quick_filters: next,
      });
      return { saved, next };
    },
    onSuccess: ({ saved, next }) => {
      queryClient.setQueryData<UserProfile | undefined>(["profile"], (current) =>
        current
          ? { ...current, knowledge_quick_filters: saved.knowledge_quick_filters }
          : saved,
      );
      setQuickFilterDefinitions(saved.knowledge_quick_filters ?? next);
      toast.success(copy.savedToast);
      onOpenChange(false);
    },
    onError: () => {
      toast.error(copy.saveFailedToast);
    },
  });

  const commandLightOpacityMutation = useMutation({
    mutationFn: async (value: number) =>
      settingsRepository.updateProfile({
        knowledge_command_light_opacity: normalizeKnowledgeCommandLightOpacity(value),
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData<UserProfile | undefined>(["profile"], saved);
    },
    onError: () => {
      toast.error(copy.commandLightOpacitySaveFailedToast);
    },
  });
  const saveCommandLightOpacity = commandLightOpacityMutation.mutate;

  useEffect(() => {
    if (!open || !commandLightOpacityDirty) return;
    applyKnowledgeCommandLightOpacityVar(commandLightOpacity);
    const timeout = window.setTimeout(() => {
      saveCommandLightOpacity(commandLightOpacity);
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [commandLightOpacity, commandLightOpacityDirty, open, saveCommandLightOpacity]);

  const updateDefinition = (
    id: string,
    updater: (def: KnowledgeQuickFilterDefinition) => KnowledgeQuickFilterDefinition,
  ) => {
    setDraft((current) => current.map((def) => (def.id === id ? updater(def) : def)));
  };

  const updateRule = (
    defId: string,
    ruleId: string,
    updater: (rule: KnowledgeQuickFilterRule) => KnowledgeQuickFilterRule,
  ) => {
    updateDefinition(defId, (def) => ({
      ...def,
      rules: def.rules.map((rule) => (rule.id === ruleId ? updater(rule) : rule)),
    }));
  };

  const moveDefinition = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [removed] = next.splice(index, 1);
      if (!removed) return current;
      next.splice(nextIndex, 0, removed);
      return next;
    });
  };

  const removeDefinition = (id: string) => {
    setDraft((current) =>
      current
        .map((def) => (def.id === id && def.builtIn ? { ...def, visible: false } : def))
        .filter((def) => def.builtIn || def.id !== id),
    );
  };

  const addDefinition = () => {
    setDraft((current) => [...current, createKnowledgeQuickFilterDefinition()]);
  };

  const resetDefaults = () => {
    setDraft(getDefaultKnowledgeQuickFilters());
  };

  const updateCommandLightOpacity = (value: number) => {
    const next = normalizeKnowledgeCommandLightOpacity(value);
    setCommandLightOpacity(next);
    setCommandLightOpacityDirty(true);
    applyKnowledgeCommandLightOpacityVar(next);
  };

  const saveDraft = () => {
    if (hasIncompleteDraft) return;
    saveMutation.mutate(draft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="5xl"
        className="flex max-h-[min(88dvh,760px)] grid-rows-[auto_minmax(0,1fr)_auto] flex-col overflow-hidden p-0"
      >
        <DialogHeader className="px-4 pt-4 sm:px-5">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 border-y border-border/60 bg-muted/20 px-4 py-2 sm:px-5">
          <div className="min-w-0 text-xs text-muted-foreground">
            {hasIncompleteDraft ? copy.incompleteDraft : `${draft.length} filters`}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={resetDefaults}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{copy.resetDefaults}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={addDefinition}
            >
              <Plus className="h-3.5 w-3.5" />
              {copy.addFilter}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          <div className="space-y-3">
            {draft.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                {copy.noFilters}
              </div>
            ) : (
              <>
                {draft.map((def, index) => (
                  <QuickFilterDefinitionEditor
                    key={def.id}
                    def={def}
                    index={index}
                    total={draft.length}
                    copy={copy}
                    typeLabels={ui.typeLabels}
                    builtInLabels={ui.quickFilters}
                    onUpdate={(updater) => updateDefinition(def.id, updater)}
                    onMove={moveDefinition}
                    onRemove={() => removeDefinition(def.id)}
                    onAddRule={() =>
                      updateDefinition(def.id, (current) => ({
                        ...current,
                        rules: [...current.rules, createKnowledgeQuickFilterRule("text")],
                      }))
                    }
                    onRemoveRule={(ruleId) =>
                      updateDefinition(def.id, (current) => ({
                        ...current,
                        rules: current.rules.filter((rule) => rule.id !== ruleId),
                      }))
                    }
                    onUpdateRule={(ruleId, updater) => updateRule(def.id, ruleId, updater)}
                  />
                ))}
              </>
            )}
            <CommandLightOpacityControl
              copy={copy}
              value={commandLightOpacity}
              isSaving={commandLightOpacityMutation.isPending}
              onChange={updateCommandLightOpacity}
            />
          </div>
        </div>

        <DialogFooter className="mt-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            {copy.cancel}
          </Button>
          <Button
            type="button"
            className="gap-1.5"
            onClick={saveDraft}
            disabled={hasIncompleteDraft || saveMutation.isPending}
          >
            <Save className="h-3.5 w-3.5" />
            {saveMutation.isPending ? copy.saving : copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommandLightOpacityControl({
  copy,
  value,
  isSaving,
  onChange,
}: {
  copy: ReturnType<typeof getKnowledgeUiCopy>["quickFilterManager"];
  value: number;
  isSaving: boolean;
  onChange: (value: number) => void;
}) {
  const normalized = normalizeKnowledgeCommandLightOpacity(value);
  const fill = `${normalized}%`;

  return (
    <section className="overflow-hidden rounded-lg border border-cyan-200/60 bg-[linear-gradient(135deg,rgba(236,254,255,0.86),rgba(250,245,255,0.82),rgba(255,251,235,0.74))] p-3 shadow-sm dark:border-cyan-200/18 dark:bg-[linear-gradient(135deg,rgba(8,47,73,0.42),rgba(59,7,100,0.32),rgba(63,63,70,0.30))]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-200/70 bg-white/72 text-cyan-700 shadow-inner dark:border-cyan-100/20 dark:bg-white/10 dark:text-cyan-200">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {copy.commandLightOpacityTitle}
            </h3>
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {copy.commandLightOpacityDescription}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-cyan-800 dark:text-cyan-100">
          <span>{normalized}%</span>
          {isSaving ? (
            <span className="rounded-full border border-cyan-200/70 bg-white/65 px-2 py-0.5 text-[11px] text-cyan-700 dark:border-cyan-100/20 dark:bg-white/10 dark:text-cyan-200">
              {copy.saving}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <div className="relative flex h-9 items-center">
          <div
            aria-hidden
            className="absolute inset-x-0 h-2 rounded-full border border-white/60 bg-white/60 shadow-inner dark:border-white/10 dark:bg-black/24"
          />
          <div
            aria-hidden
            className="absolute h-2 rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#a855f7_36%,#ec4899_58%,#f59e0b_78%,#84cc16_100%)] shadow-[0_0_18px_rgba(34,211,238,0.34)]"
            style={{ width: fill }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-cyan-100 shadow-[0_4px_14px_rgba(14,116,144,0.28)] dark:border-cyan-950 dark:bg-cyan-200"
            style={{ left: fill }}
          />
          <input
            type="range"
            min={MIN_KNOWLEDGE_COMMAND_LIGHT_OPACITY}
            max={MAX_KNOWLEDGE_COMMAND_LIGHT_OPACITY}
            step={5}
            value={normalized}
            aria-label={copy.commandLightOpacityLabel}
            aria-valuetext={`${normalized}%`}
            onChange={(event) => onChange(Number(event.currentTarget.value))}
            className="relative z-10 m-0 h-9 w-full cursor-pointer appearance-none rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span>{copy.commandLightOpacityQuiet}</span>
          <span>{copy.commandLightOpacityVivid}</span>
        </div>
      </div>
    </section>
  );
}

function QuickFilterDefinitionEditor({
  def,
  index,
  total,
  copy,
  typeLabels,
  builtInLabels,
  onUpdate,
  onMove,
  onRemove,
  onAddRule,
  onRemoveRule,
  onUpdateRule,
}: {
  def: KnowledgeQuickFilterDefinition;
  index: number;
  total: number;
  copy: ReturnType<typeof getKnowledgeUiCopy>["quickFilterManager"];
  typeLabels: Record<ContentType, string>;
  builtInLabels: Record<KnowledgeBuiltinQuickFilterId, string>;
  onUpdate: (
    updater: (def: KnowledgeQuickFilterDefinition) => KnowledgeQuickFilterDefinition,
  ) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: () => void;
  onAddRule: () => void;
  onRemoveRule: (ruleId: string) => void;
  onUpdateRule: (
    ruleId: string,
    updater: (rule: KnowledgeQuickFilterRule) => KnowledgeQuickFilterRule,
  ) => void;
}) {
  const Icon = KNOWLEDGE_QUICK_FILTER_ICON_COMPONENTS[def.icon];

  return (
    <section className="rounded-lg border border-border/70 bg-background/75 p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_150px_150px]">
          <div className="space-y-1.5">
            <Label className="text-xs">{copy.filterLabel}</Label>
            <Input
              value={def.label}
              placeholder={copy.filterNamePlaceholder}
              className={cn(!def.label.trim() && "border-destructive/60")}
              onChange={(event) =>
                onUpdate((current) => ({ ...current, label: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{copy.iconLabel}</Label>
            <Select
              value={def.icon}
              onValueChange={(value) =>
                onUpdate((current) => ({
                  ...current,
                  icon: value as KnowledgeQuickFilterDefinition["icon"],
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_QUICK_FILTER_ICON_KEYS.map((iconKey) => {
                  const OptionIcon = KNOWLEDGE_QUICK_FILTER_ICON_COMPONENTS[iconKey];
                  return (
                    <SelectItem key={iconKey} value={iconKey}>
                      <OptionIcon className="h-3.5 w-3.5" />
                      {copy.iconLabels[iconKey] ?? iconKey}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{copy.matchLabel}</Label>
            <Select
              value={def.match}
              onValueChange={(value) =>
                onUpdate((current) => ({
                  ...current,
                  match: value === "any" ? "any" : "all",
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.matchAll}</SelectItem>
                <SelectItem value="any">{copy.matchAny}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
          <span className="inline-flex h-7 items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 text-[11px] text-muted-foreground">
            <Icon className="h-3 w-3" />
            {def.builtIn ? copy.builtInBadge : copy.customBadge}
          </span>
          <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-background/70 pl-1 pr-2 text-xs text-muted-foreground">
            <Checkbox
              checked={def.visible}
              onCheckedChange={(checked) =>
                onUpdate((current) => ({ ...current, visible: checked === true }))
              }
              className="size-8"
            />
            {copy.visibleLabel}
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={copy.moveUp}
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={copy.moveDown}
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant={def.builtIn ? "ghost" : "destructive"}
            size="sm"
            className="gap-1.5"
            onClick={onRemove}
          >
            {def.builtIn ? (
              def.visible ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {def.builtIn ? copy.hide : copy.delete}
          </Button>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-border/50 bg-muted/15 p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{copy.rulesHeading}</p>
          <Button type="button" variant="outline" size="xs" className="gap-1" onClick={onAddRule}>
            <Plus className="h-3 w-3" />
            {copy.addRule}
          </Button>
        </div>

        <div className="space-y-2">
          {def.rules.map((rule) => (
            <QuickFilterRuleEditor
              key={rule.id}
              rule={rule}
              copy={copy}
              typeLabels={typeLabels}
              builtInLabels={builtInLabels}
              onUpdate={(updater) => onUpdateRule(rule.id, updater)}
              onRemove={() => onRemoveRule(rule.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickFilterRuleEditor({
  rule,
  copy,
  typeLabels,
  builtInLabels,
  onUpdate,
  onRemove,
}: {
  rule: KnowledgeQuickFilterRule;
  copy: ReturnType<typeof getKnowledgeUiCopy>["quickFilterManager"];
  typeLabels: Record<ContentType, string>;
  builtInLabels: Record<KnowledgeBuiltinQuickFilterId, string>;
  onUpdate: (updater: (rule: KnowledgeQuickFilterRule) => KnowledgeQuickFilterRule) => void;
  onRemove: () => void;
}) {
  const complete = isKnowledgeQuickFilterRuleComplete(rule);
  const valueControl = renderValueControl(rule, copy, typeLabels, builtInLabels, onUpdate);
  const operatorControl = renderOperatorControl(rule, copy, onUpdate);

  return (
    <div
      className={cn(
        "grid gap-2 rounded-lg border bg-background/80 p-2 sm:grid-cols-[170px_130px_minmax(0,1fr)_auto] sm:items-end",
        complete ? "border-border/50" : "border-destructive/50",
      )}
    >
      <div className="space-y-1.5">
        <Label className="text-[11px]">{copy.fieldLabel}</Label>
        <Select
          value={rule.field}
          onValueChange={(value) => {
            const field = value as KnowledgeQuickFilterRuleField;
            onUpdate((current) => ({
              ...current,
              field,
              operator: operatorForKnowledgeQuickFilterField(field),
              value: defaultValueForKnowledgeQuickFilterField(field),
            }));
          }}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KNOWLEDGE_QUICK_FILTER_FIELDS.map((field) => (
              <SelectItem key={field} value={field}>
                {copy.ruleFields[field] ?? field}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px]">{copy.operatorLabel}</Label>
        {operatorControl}
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px]">{copy.valueLabel}</Label>
        {valueControl}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="self-end text-muted-foreground hover:text-destructive"
        aria-label={copy.removeRule}
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function renderOperatorControl(
  rule: KnowledgeQuickFilterRule,
  copy: ReturnType<typeof getKnowledgeUiCopy>["quickFilterManager"],
  onUpdate: (updater: (rule: KnowledgeQuickFilterRule) => KnowledgeQuickFilterRule) => void,
) {
  if (rule.field === "sourceUrl" || rule.field === "media") {
    return (
      <Select
        value={rule.operator}
        onValueChange={(value) =>
          onUpdate((current) => ({
            ...current,
            operator: value === "missing" ? "missing" : "present",
          }))
        }
      >
        <SelectTrigger className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="present">{copy.present}</SelectItem>
          <SelectItem value="missing">{copy.missing}</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="flex h-9 items-center rounded-lg border border-border/60 bg-muted/40 px-2.5 text-xs text-muted-foreground">
      {copy.ruleOperators[rule.operator] ?? rule.operator}
    </div>
  );
}

function renderValueControl(
  rule: KnowledgeQuickFilterRule,
  copy: ReturnType<typeof getKnowledgeUiCopy>["quickFilterManager"],
  typeLabels: Record<ContentType, string>,
  builtInLabels: Record<KnowledgeBuiltinQuickFilterId, string>,
  onUpdate: (updater: (rule: KnowledgeQuickFilterRule) => KnowledgeQuickFilterRule) => void,
) {
  if (rule.field === "sourceUrl" || rule.field === "media") {
    return (
      <div className="flex h-9 items-center rounded-lg border border-border/60 bg-muted/40 px-2.5 text-xs text-muted-foreground">
        {rule.operator === "missing" ? copy.missing : copy.present}
      </div>
    );
  }

  if (rule.field === "tag" || rule.field === "text") {
    return (
      <Input
        value={typeof rule.value === "string" ? rule.value : ""}
        placeholder={
          rule.field === "tag" ? copy.tagValuePlaceholder : copy.textValuePlaceholder
        }
        onChange={(event) =>
          onUpdate((current) => ({ ...current, value: event.target.value }))
        }
      />
    );
  }

  if (rule.field === "dateAdded") {
    return (
      <Input
        type="number"
        min={1}
        max={3650}
        value={typeof rule.value === "number" && rule.value > 0 ? rule.value : ""}
        placeholder={copy.daysValuePlaceholder}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          onUpdate((current) => ({
            ...current,
            value: Number.isFinite(parsed) ? parsed : 0,
          }));
        }}
      />
    );
  }

  const options = getValueOptions(rule.field, typeLabels, builtInLabels);
  return (
    <Select
      value={typeof rule.value === "string" ? rule.value : ""}
      onValueChange={(value) => onUpdate((current) => ({ ...current, value }))}
    >
      <SelectTrigger className="h-9 w-full">
        <SelectValue placeholder={copy.selectValue} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function getValueOptions(
  field: KnowledgeQuickFilterRuleField,
  typeLabels: Record<ContentType, string>,
  builtInLabels: Record<KnowledgeBuiltinQuickFilterId, string>,
): { value: string; label: string }[] {
  switch (field) {
    case "builtin":
      return KNOWLEDGE_BUILTIN_QUICK_FILTER_IDS.map((id) => ({
        value: id,
        label: builtInLabels[id],
      }));
    case "contentType":
      return CONTENT_TYPES.map((type) => ({ value: type, label: typeLabels[type] }));
    case "category":
      return KNOWLEDGE_CATEGORY_ORDER.map((category) => ({
        value: category,
        label: getCategoryLabel(category),
      }));
    case "provider":
      return KNOWLEDGE_QUICK_FILTER_PROVIDER_VALUES.map((provider) => ({
        value: provider,
        label: providerLabel(provider),
      }));
    case "sourceType":
      return SOURCE_TYPES.map((sourceType) => ({
        value: sourceType,
        label: getSourceTypeInfo(sourceType).label,
      }));
    case "status":
      return KNOWLEDGE_QUICK_FILTER_STATUS_VALUES.map((status) => ({
        value: status,
        label: statusLabel(status),
      }));
    default:
      return [];
  }
}
