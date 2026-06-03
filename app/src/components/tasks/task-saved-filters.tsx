"use client";

import { useState } from "react";
import { Bookmark, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";
import { hasActiveFilters, type TaskFilterState } from "@/lib/tasks/task-filters";
import {
  addCustomPreset,
  BUILT_IN_PRESETS,
  deleteCustomPreset,
  isSameFilter,
  loadCustomPresets,
  type BuiltInPresetId,
  type TaskFilterPreset,
} from "@/lib/tasks/saved-filters";

interface TaskSavedFiltersProps {
  copy: TasksCenterUiCopy;
  filter: TaskFilterState;
  onApply: (filter: TaskFilterState) => void;
}

function builtInLabel(copy: TasksCenterUiCopy, id: BuiltInPresetId): string {
  switch (id) {
    case "my-focus":
      return copy.presetMyFocus;
    case "due-today":
      return copy.presetDueToday;
    case "overdue-high":
      return copy.presetOverdueHigh;
    case "this-week":
      return copy.presetThisWeek;
    case "no-project":
      return copy.presetNoProject;
    case "ai-generated":
      return copy.presetAiGenerated;
    case "project-tasks":
      return copy.presetProjectTasks;
  }
}

export function TaskSavedFilters({ copy, filter, onApply }: TaskSavedFiltersProps) {
  const [custom, setCustom] = useState<TaskFilterPreset[]>(loadCustomPresets);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

  const canSave = hasActiveFilters(filter);

  const handleSave = () => {
    if (!name.trim()) return;
    setCustom(addCustomPreset(name, filter));
    setName("");
    setSaveOpen(false);
  };

  const handleDelete = (id: string) => {
    setCustom(deleteCustomPreset(id));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Bookmark className="h-3.5 w-3.5" />
        {copy.savedFilters}
      </span>

      {BUILT_IN_PRESETS.map((p) => {
        const active = isSameFilter(filter, p.filter);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onApply(p.filter)}
            className={cn(
              "min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted",
            )}
          >
            {builtInLabel(copy, p.id)}
          </button>
        );
      })}

      {custom.map((p) => {
        const active = isSameFilter(filter, p.filter);
        return (
          <span
            key={p.id}
            className={cn(
              "inline-flex min-h-11 items-center gap-1 rounded-xl border py-1 pl-3 pr-1 text-sm font-semibold transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted",
            )}
          >
            <button
              type="button"
              onClick={() => onApply(p.filter)}
              className="min-h-9"
            >
              {p.name}
            </button>
            <button
              type="button"
              onClick={() => handleDelete(p.id)}
              aria-label={copy.deletePresetAria}
              className="flex size-9 items-center justify-center rounded-lg opacity-70 hover:bg-background/20 hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}

      {canSave && (
        <Popover open={saveOpen} onOpenChange={setSaveOpen}>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="sm" className="min-h-11 gap-1 rounded-xl text-sm" />
            }
          >
            <Plus className="h-3.5 w-3.5" />
            {copy.saveCurrent}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 space-y-2 p-3">
            <Input
              value={name}
              autoFocus
              placeholder={copy.savePresetPlaceholder}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
            <Button
              size="sm"
              className="min-h-11 w-full rounded-xl"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              {copy.savePresetAction}
            </Button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
