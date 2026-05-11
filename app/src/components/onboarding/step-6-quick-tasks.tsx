"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import type { getThemeUiCopy } from "@/lib/i18n/theme-ui";
import type { QuickTaskDef } from "@/types/database";
import {
  inferQuickTaskIconKey,
  QUICK_TASK_ICON_MAP,
  resolveQuickTaskIconKey,
} from "@/lib/quick-task-icon";

const DEFAULT_QUICK_TASKS: QuickTaskDef[] = [
  { name: "Breakfast", icon: "coffee", blocks: 3, iconClass: "text-amber-700 dark:text-amber-300", presetKey: "breakfast" },
  { name: "Lunch", icon: "utensils", blocks: 6, iconClass: "text-emerald-700 dark:text-emerald-300", presetKey: "lunch" },
  { name: "Dinner", icon: "soup", blocks: 8, iconClass: "text-orange-700 dark:text-orange-300", presetKey: "dinner" },
  { name: "Gym", icon: "dumbbell", blocks: 9, iconClass: "text-rose-700 dark:text-rose-300", presetKey: "gym" },
  { name: "Meditate", icon: "wind", blocks: 1, iconClass: "text-sky-700 dark:text-sky-300", presetKey: "meditate" },
  { name: "Improvise", icon: "drama", blocks: 3, iconClass: "text-violet-700 dark:text-violet-300", presetKey: "improvise" },
  { name: "Read", icon: "book-open", blocks: 2, iconClass: "text-indigo-700 dark:text-indigo-300", presetKey: "read" },
  { name: "Journal", icon: "notebook-pen", blocks: 1, iconClass: "text-teal-700 dark:text-teal-300", presetKey: "journal" },
  { name: "Break", icon: "timer", blocks: 1, iconClass: "text-amber-800/90 dark:text-amber-200/90", presetKey: "break" },
  { name: "Rest", icon: "moon", blocks: 2, iconClass: "text-slate-600 dark:text-slate-300", presetKey: "rest" },
];

const ICON_COLORS = [
  "text-amber-700 dark:text-amber-300",
  "text-emerald-700 dark:text-emerald-300",
  "text-rose-700 dark:text-rose-300",
  "text-sky-700 dark:text-sky-300",
  "text-violet-700 dark:text-violet-300",
  "text-indigo-700 dark:text-indigo-300",
  "text-teal-700 dark:text-teal-300",
  "text-orange-700 dark:text-orange-300",
];

type Step6Props = {
  tasks: QuickTaskDef[];
  onChange: (tasks: QuickTaskDef[]) => void;
  onNext: () => void;
  onBack: () => void;
  ui: ReturnType<typeof getThemeUiCopy>;
};

export { DEFAULT_QUICK_TASKS };

export function Step6QuickTasks({
  tasks,
  onChange,
  onNext,
  onBack,
  ui,
}: Step6Props) {
  const [newName, setNewName] = useState("");
  const [newBlocks, setNewBlocks] = useState(3);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const color = ICON_COLORS[tasks.length % ICON_COLORS.length];
    onChange([
      ...tasks,
      {
        name: trimmed,
        icon: inferQuickTaskIconKey(trimmed),
        blocks: newBlocks,
        iconClass: color,
        presetKey: null,
        iconUrl: null,
      },
    ]);
    setNewName("");
    setNewBlocks(3);
  };

  const handleDelete = (index: number) => {
    onChange(tasks.filter((_, i) => i !== index));
  };

  const handleUseDefaults = () => {
    onChange([...DEFAULT_QUICK_TASKS]);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">
          {ui.onboardingQuickTasksTitle}
        </h2>
        <p className="text-sm text-neutral-400">
          {ui.onboardingQuickTasksSubtitle}
        </p>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
        {tasks.map((t, i) => {
          const key = resolveQuickTaskIconKey(t.name, t.icon);
          const TaskIcon = QUICK_TASK_ICON_MAP[key] ?? QUICK_TASK_ICON_MAP.sparkles;
          return (
            <div
              key={`${t.name}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <TaskIcon className={cn("h-4 w-4 shrink-0", t.iconClass)} />
              <span className="flex-1 truncate text-sm text-white">
                {t.name}
              </span>
              <span className="text-xs text-neutral-400 shrink-0">
                {t.blocks}b
              </span>
              <button
                type="button"
                onClick={() => handleDelete(i)}
                className="shrink-0 text-neutral-500 hover:text-red-400 transition-colors"
                aria-label={`Remove ${t.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-neutral-400">
          {ui.onboardingQuickTasksAddLabel}
        </Label>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={ui.onboardingQuickTasksNamePlaceholder}
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
          />
          <Input
            type="number"
            min={1}
            max={30}
            value={newBlocks}
            onChange={(e) => setNewBlocks(Math.max(1, Number(e.target.value)))}
            className="w-16 bg-white/5 border-white/10 text-white text-center"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="shrink-0 border-white/10"
            onClick={handleAdd}
            disabled={!newName.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-neutral-400"
        >
          {ui.back}
        </Button>
        <div className="flex gap-2">
          {tasks.length === 0 && (
            <Button
              variant="ghost"
              onClick={handleUseDefaults}
              className="text-neutral-400"
            >
              {ui.onboardingQuickTasksUseDefaults}
            </Button>
          )}
          <Button onClick={onNext}>
            {tasks.length > 0 ? ui.continue : ui.skip}
          </Button>
        </div>
      </div>
    </div>
  );
}
