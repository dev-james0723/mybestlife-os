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
import { useIdeasStore } from "@/stores/ideas-store";
import { IDEA_CATEGORIES, type IdeaCategorySlug } from "@/lib/ideas/constants";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import {
  createIdeaQuickFilterDefinition,
  createIdeaQuickFilterRule,
  defaultValueForIdeaQuickFilterField,
  getDefaultIdeaQuickFilters,
  hasIncompleteIdeaQuickFilterDraft,
  IDEA_BUILTIN_QUICK_FILTER_IDS,
  IDEA_QUICK_FILTER_CAPTURE_KIND_VALUES,
  IDEA_QUICK_FILTER_FIELDS,
  IDEA_QUICK_FILTER_ICON_KEYS,
  IDEA_QUICK_FILTER_SOURCE_TYPE_VALUES,
  IDEA_QUICK_FILTER_STATUS_VALUES,
  isIdeaQuickFilterRuleComplete,
  operatorForIdeaQuickFilterField,
  serializeIdeaQuickFilters,
  type IdeaBuiltinQuickFilterId,
  type IdeaQuickFilterDefinition,
  type IdeaQuickFilterRule,
  type IdeaQuickFilterRuleField,
} from "@/lib/ideas/quick-filters";
import { settingsRepository } from "@/lib/repositories/settings";
import type { CaptureKind, Idea, UserProfile } from "@/types/database";
import { cn } from "@/lib/utils";
import { IDEA_QUICK_FILTER_ICON_COMPONENTS } from "./ideaQuickFilterIcons";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function cloneDefinitions(
  defs: IdeaQuickFilterDefinition[],
): IdeaQuickFilterDefinition[] {
  return defs.map((def) => ({
    ...def,
    rules: def.rules.map((rule) => ({ ...rule })),
  }));
}

export function IdeasQuickFiltersDialog({ open, onOpenChange }: Props) {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const copy = ui.quickFilterManager;
  const queryClient = useQueryClient();
  const quickFilterDefinitions = useIdeasStore((s) => s.quickFilterDefinitions);
  const setQuickFilterDefinitions = useIdeasStore((s) => s.setQuickFilterDefinitions);
  const [draft, setDraft] = useState<IdeaQuickFilterDefinition[]>(() =>
    cloneDefinitions(quickFilterDefinitions),
  );

  useEffect(() => {
    if (!open) return;
    setDraft(cloneDefinitions(quickFilterDefinitions));
  }, [open, quickFilterDefinitions]);

  const hasIncompleteDraft = useMemo(
    () => hasIncompleteIdeaQuickFilterDraft(draft),
    [draft],
  );

  const saveMutation = useMutation({
    mutationFn: async (defs: IdeaQuickFilterDefinition[]) => {
      const next = serializeIdeaQuickFilters(defs);
      const saved = await settingsRepository.updateProfile({
        idea_quick_filters: next,
      });
      return { saved, next };
    },
    onSuccess: ({ saved, next }) => {
      queryClient.setQueryData<UserProfile | undefined>(["profile"], (current) =>
        current
          ? { ...current, idea_quick_filters: saved.idea_quick_filters }
          : saved,
      );
      setQuickFilterDefinitions(saved.idea_quick_filters ?? next);
      toast.success(copy.savedToast);
      onOpenChange(false);
    },
    onError: () => {
      toast.error(copy.saveFailedToast);
    },
  });

  const updateDefinition = (
    id: string,
    updater: (def: IdeaQuickFilterDefinition) => IdeaQuickFilterDefinition,
  ) => {
    setDraft((current) => current.map((def) => (def.id === id ? updater(def) : def)));
  };

  const updateRule = (
    defId: string,
    ruleId: string,
    updater: (rule: IdeaQuickFilterRule) => IdeaQuickFilterRule,
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
    setDraft((current) => [...current, createIdeaQuickFilterDefinition()]);
  };

  const resetDefaults = () => {
    setDraft(getDefaultIdeaQuickFilters());
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
          {draft.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
              {copy.noFilters}
            </div>
          ) : (
            <div className="space-y-3">
              {draft.map((def, index) => (
                <QuickFilterDefinitionEditor
                  key={def.id}
                  def={def}
                  index={index}
                  total={draft.length}
                  copy={copy}
                  ui={ui}
                  onUpdate={(updater) => updateDefinition(def.id, updater)}
                  onMove={moveDefinition}
                  onRemove={() => removeDefinition(def.id)}
                  onAddRule={() =>
                    updateDefinition(def.id, (current) => ({
                      ...current,
                      rules: [...current.rules, createIdeaQuickFilterRule("text")],
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
            </div>
          )}
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

function QuickFilterDefinitionEditor({
  def,
  index,
  total,
  copy,
  ui,
  onUpdate,
  onMove,
  onRemove,
  onAddRule,
  onRemoveRule,
  onUpdateRule,
}: {
  def: IdeaQuickFilterDefinition;
  index: number;
  total: number;
  copy: ReturnType<typeof getIdeasUiCopy>["quickFilterManager"];
  ui: ReturnType<typeof getIdeasUiCopy>;
  onUpdate: (
    updater: (def: IdeaQuickFilterDefinition) => IdeaQuickFilterDefinition,
  ) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: () => void;
  onAddRule: () => void;
  onRemoveRule: (ruleId: string) => void;
  onUpdateRule: (
    ruleId: string,
    updater: (rule: IdeaQuickFilterRule) => IdeaQuickFilterRule,
  ) => void;
}) {
  const Icon = IDEA_QUICK_FILTER_ICON_COMPONENTS[def.icon];

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
                  icon: value as IdeaQuickFilterDefinition["icon"],
                }))
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IDEA_QUICK_FILTER_ICON_KEYS.map((iconKey) => {
                  const OptionIcon = IDEA_QUICK_FILTER_ICON_COMPONENTS[iconKey];
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
              ui={ui}
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
  ui,
  onUpdate,
  onRemove,
}: {
  rule: IdeaQuickFilterRule;
  copy: ReturnType<typeof getIdeasUiCopy>["quickFilterManager"];
  ui: ReturnType<typeof getIdeasUiCopy>;
  onUpdate: (updater: (rule: IdeaQuickFilterRule) => IdeaQuickFilterRule) => void;
  onRemove: () => void;
}) {
  const complete = isIdeaQuickFilterRuleComplete(rule);
  const valueControl = renderValueControl(rule, copy, ui, onUpdate);
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
            const field = value as IdeaQuickFilterRuleField;
            onUpdate((current) => ({
              ...current,
              field,
              operator: operatorForIdeaQuickFilterField(field),
              value: defaultValueForIdeaQuickFilterField(field),
            }));
          }}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IDEA_QUICK_FILTER_FIELDS.map((field) => (
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
  rule: IdeaQuickFilterRule,
  copy: ReturnType<typeof getIdeasUiCopy>["quickFilterManager"],
  onUpdate: (updater: (rule: IdeaQuickFilterRule) => IdeaQuickFilterRule) => void,
) {
  if (rule.field === "related" || rule.field === "attachments") {
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
  rule: IdeaQuickFilterRule,
  copy: ReturnType<typeof getIdeasUiCopy>["quickFilterManager"],
  ui: ReturnType<typeof getIdeasUiCopy>,
  onUpdate: (updater: (rule: IdeaQuickFilterRule) => IdeaQuickFilterRule) => void,
) {
  if (rule.field === "related" || rule.field === "attachments") {
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

  const options = getValueOptions(rule.field, ui);
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
  field: IdeaQuickFilterRuleField,
  ui: ReturnType<typeof getIdeasUiCopy>,
): { value: string; label: string }[] {
  switch (field) {
    case "builtin":
      return IDEA_BUILTIN_QUICK_FILTER_IDS.map((id) => ({
        value: id,
        label: ui.quickLabels[id],
      }));
    case "sourceType":
      return IDEA_QUICK_FILTER_SOURCE_TYPE_VALUES.map((sourceType) => ({
        value: sourceType,
        label: ui.sourceLabels[sourceType],
      }));
    case "category":
      return IDEA_CATEGORIES.map((category: IdeaCategorySlug) => ({
        value: category,
        label: ui.categoryLabels[category],
      }));
    case "status":
      return IDEA_QUICK_FILTER_STATUS_VALUES.map((status: Idea["status"]) => ({
        value: status,
        label: ui.statusLabels[status],
      }));
    case "captureKind":
      return IDEA_QUICK_FILTER_CAPTURE_KIND_VALUES.map((kind: CaptureKind) => ({
        value: kind,
        label: ui.captureKindLabels[kind],
      }));
    default:
      return [];
  }
}
